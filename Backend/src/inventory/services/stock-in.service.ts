import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PreviewStockInDTO, StockInDTO } from '../dto/stock-in.dto';

@Injectable()
export class StockInService {
  constructor(private readonly prisma: PrismaService) { }

  async previewStockIn(dto: PreviewStockInDTO) {
    const [masterProduct, color] = await Promise.all([
      this.prisma.masterProduct.findUnique({
        where: { id: dto.masterProductId },
        include: {
          category: true,
          subCategory: true,
          material: true,
        },
      }),
      this.prisma.color.findUnique({ where: { id: dto.colorId } }),
    ]);

    if (!masterProduct) {
      throw new NotFoundException('Master Product not found');
    }
    if (!color) {
      throw new NotFoundException('Color not found');
    }

    const variants = await this.prisma.variantProduct.findMany({
      where: {
        masterProductId: dto.masterProductId,
        colorId: dto.colorId,
        gender: dto.gender,
        status: 'ACTIVE',
      },
      include: {
        color: { select: { id: true, name: true, code: true } },
      },
      orderBy: { size: 'asc' },
    });

    const locations = await this.prisma.storageLocation.findMany({
      where: { status: 'ACTIVE' },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        zone: { select: { id: true, name: true, code: true } },
        subZone: { select: { id: true, name: true, code: true } },
        rack: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ warehouseId: 'asc' }, { code: 'asc' }],
    });

    return {
      masterProduct: {
        id: masterProduct.id,
        name: masterProduct.name,
        sku: masterProduct.sku,
        category: masterProduct.category.name,
        subCategory: masterProduct.subCategory.name,
        material: masterProduct.material.name,
      },
      color: {
        id: color.id,
        name: color.name,
        code: color.code,
      },
      gender: dto.gender,
      variants: variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        barcode: v.barcode,
        size: v.size,
        uom: v.uom,
        itemsPerPacket: v.itemsPerPacket,
        packingType: v.packingType,
        shippableQuantity: v.shippableQuantity,
      })),
      availableLocations: locations,
    };
  }

  async executeStockIn(dto: StockInDTO, file?: Express.Multer.File) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item must be provided for stock-in');
    }

    // 1. Strictly filter active items with quantity > 0 (0-quantity sizes are never created)
    const activeItems = dto.items.filter(
      (item) => Number(item.receivedQty || item.quantity || 0) > 0,
    );

    if (activeItems.length === 0) {
      throw new BadRequestException(
        'At least one item with received quantity > 0 must be provided for stock-in',
      );
    }

    // 2. Validate Dates & Generate Batch Identifiers
    const productionDate = new Date(dto.productionDate);
    const expirationDate =
      dto.expirationDate ? new Date(dto.expirationDate) : this.addYears(productionDate, 2);

    const batchId = dto.batch_id?.trim().toUpperCase() || this.generateBatchId(productionDate);
    const batchNumber = dto.batch_number?.trim().toUpperCase() || this.generateBatchNumber();

    // 3. Execute Complete Atomic Transaction (Variant Creation + Batch + Movements)
    return this.prisma.$transaction(async (tx) => {
      // Step A: Resolve Rack IDs to Location IDs in batch
      const rackIdsToResolve = [
        ...new Set(
          activeItems
            .filter((i) => !i.locationId && i.rackId)
            .map((i) => i.rackId as string),
        ),
      ];

      if (rackIdsToResolve.length > 0) {
        const rackLocations = await tx.storageLocation.findMany({
          where: { rackId: { in: rackIdsToResolve }, status: { not: 'DELETED' } },
        });
        const rackLocationMap = new Map(rackLocations.map((l) => [l.rackId!, l.id]));

        for (const item of activeItems) {
          if (!item.locationId && item.rackId && rackLocationMap.has(item.rackId)) {
            item.locationId = rackLocationMap.get(item.rackId);
          }
        }
      }

      // Step B: Batch Resolve / Auto-Create Custom Size Variants
      const customItems = activeItems.filter((i) => !i.variantProductId && i.size);

      if (customItems.length > 0) {
        if (!dto.masterProductId || !dto.colorId) {
          throw new BadRequestException(
            'masterProductId and colorId are required to resolve custom sizes',
          );
        }

        const [masterProduct, color] = await Promise.all([
          tx.masterProduct.findUnique({
            where: { id: dto.masterProductId },
            include: { category: true, subCategory: true },
          }),
          tx.color.findUnique({ where: { id: dto.colorId } }),
        ]);

        if (!masterProduct || masterProduct.status === 'DELETED') {
          throw new NotFoundException('Master Product not found or deleted');
        }
        if (!color || color.status === 'DELETED') {
          throw new NotFoundException('Color not found or deleted');
        }

        const candidateSizes = [
          ...new Set(customItems.map((i) => i.size!.trim().toUpperCase())),
        ];

        const candidateSkus = candidateSizes.map(
          (s) => `${masterProduct.sku}-${color.name.toUpperCase().replace(/\s+/g, '')}-${s}`,
        );

        // Find existing variants by masterProduct + color + size OR by SKU
        const existingVariants = await tx.variantProduct.findMany({
          where: {
            OR: [
              {
                masterProductId: dto.masterProductId,
                colorId: dto.colorId,
                size: { in: candidateSizes },
              },
              {
                sku: { in: candidateSkus },
              },
            ],
          },
        });

        for (const item of customItems) {
          const cleanSize = item.size!.trim().toUpperCase();
          const gender = item.gender || dto.gender || 'MALE';
          const cleanSku = `${masterProduct.sku}-${color.name.toUpperCase().replace(/\s+/g, '')}-${cleanSize}`;

          // Find matching variant
          let matched = existingVariants.find(
            (v) =>
              (v.masterProductId === masterProduct.id &&
                v.colorId === color.id &&
                v.size.toUpperCase() === cleanSize) ||
              v.sku.toUpperCase() === cleanSku.toUpperCase(),
          );

          if (matched) {
            if (matched.status === 'DELETED') {
              await tx.variantProduct.update({
                where: { id: matched.id },
                data: { status: 'ACTIVE' },
              });
            }
            item.variantProductId = matched.id;
          } else {
            const existingBySku = await tx.variantProduct.findUnique({
              where: { sku: cleanSku },
            });

            if (existingBySku) {
              if (existingBySku.status === 'DELETED') {
                await tx.variantProduct.update({
                  where: { id: existingBySku.id },
                  data: { status: 'ACTIVE' },
                });
              }
              item.variantProductId = existingBySku.id;
            } else {
              throw new BadRequestException(
                `Product variant for size '${cleanSize}' (${cleanSku}) does not exist in the catalog. Products must be pre-configured by product management before receiving stock.`,
              );
            }
          }
        }
      }

      // Step C: Validate all Variant IDs and Destination Locations
      const variantIds = [
        ...new Set(activeItems.map((i) => i.variantProductId).filter(Boolean)),
      ] as string[];
      const locationIds = [
        ...new Set(
          activeItems.map((i) => i.locationId || dto.defaultLocationId).filter(Boolean),
        ),
      ] as string[];

      if (locationIds.length === 0) {
        throw new BadRequestException(
          'A destination storage location must be provided either globally (defaultLocationId) or per item',
        );
      }

      const [variants, locations] = await Promise.all([
        tx.variantProduct.findMany({
          where: { id: { in: variantIds } },
          include: { masterProduct: true, color: true },
        }),
        tx.storageLocation.findMany({
          where: { id: { in: locationIds }, status: { not: 'DELETED' } },
        }),
      ]);

      const variantMap = new Map(variants.map((v) => [v.id, v]));
      const locationMap = new Map(locations.map((l) => [l.id, l]));

      for (const item of activeItems) {
        const variant = variantMap.get(item.variantProductId!);
        if (!variant) {
          throw new NotFoundException(`Variant Product '${item.variantProductId}' not found`);
        }

        const targetLocationId = item.locationId || dto.defaultLocationId;
        if (!targetLocationId || !locationMap.has(targetLocationId)) {
          throw new NotFoundException(`Storage Location '${targetLocationId}' not found`);
        }
      }

      // Step D: Create Batch
      const batch = await tx.batch.create({
        data: {
          batch_id: batchId,
          batch_number: batchNumber,
          productionDate,
          expirationDate,
          poId: dto.poId || null,
        },
      });

      let documentRecord: any = null;
      if (file) {
        const normalizedPath = file.path.replace(/\\/g, '/');
        documentRecord = await tx.document.create({
          data: {
            name: file.originalname,
            path: normalizedPath,
            mimeType: file.mimetype,
            size: file.size,
            batchId: batch.id,
          },
        });
      }

      let totalReceivedPairs = 0;
      let totalReceivedPackets = 0;
      const variantQtyMap = new Map<string, number>();

      const batchItemsToCreate = activeItems.map((item) => {
        const variant = variantMap.get(item.variantProductId!)!;
        const targetLocationId = (item.locationId || dto.defaultLocationId)!;
        const itemsPerPacket =
          item.itemsPerPacket || dto.itemsPerPacket || variant.itemsPerPacket || 1;
        const receivedQty =
          item.receivedQty ||
          item.quantity ||
          (item.packetCount ? item.packetCount * itemsPerPacket : itemsPerPacket);
        const packetCount =
          item.packetCount || Math.ceil(receivedQty / itemsPerPacket);

        totalReceivedPairs += receivedQty;
        totalReceivedPackets += packetCount;

        const currentSum = variantQtyMap.get(variant.id) || 0;
        variantQtyMap.set(variant.id, currentSum + receivedQty);

        return {
          productId: variant.id,
          batchId: batch.id,
          locationId: targetLocationId,
          receivedQty,
          availableQty: receivedQty,
          itemsPerPacket,
          packetCount,
        };
      });

      // Step E: Bulk Insert Batch Items & Movement Audit Ledger
      const createdBatchItems = await tx.batchItem.createManyAndReturn({
        data: batchItemsToCreate,
        include: {
          product: { select: { id: true, name: true, sku: true, size: true } },
          location: { select: { id: true, code: true, name: true } },
        },
      });

      await tx.inventoryMovement.createMany({
        data: createdBatchItems.map((bi) => ({
          inventoryBatchItemId: bi.id,
          type: 'RECEIVED' as const,
          quantity: bi.receivedQty,
          referenceId: batch.id,
          note:
            dto.note ||
            `Batch stock-in '${batch.batch_id}' into location '${bi.location?.code}'`,
        })),
      });

      // Step F: Increment shippable stock on variants in deterministic ID order
      const sortedVariantEntries = Array.from(variantQtyMap.entries()).sort(
        ([a], [b]) => a.localeCompare(b),
      );

      for (const [variantId, qty] of sortedVariantEntries) {
        await tx.variantProduct.update({
          where: { id: variantId },
          data: { shippableQuantity: { increment: qty } },
        });
      }

      // Step G: Auto advance PO production progress if poId is attached
      if (dto.poId) {
        for (const [variantId, qty] of sortedVariantEntries) {
          await tx.pOItem.updateMany({
            where: {
              poId: dto.poId,
              variantProductId: variantId,
            },
            data: {
              producedQuantity: { increment: qty },
            },
          });
        }

        const poItems = await tx.pOItem.findMany({ where: { poId: dto.poId } });
        if (poItems.length > 0) {
          const isAllProduced = poItems.every((i) => (i.producedQuantity ?? 0) >= i.quantity);
          const hasAnyProduced = poItems.some((i) => (i.producedQuantity ?? 0) > 0);

          await tx.pO.update({
            where: { id: dto.poId },
            data: {
              status: isAllProduced
                ? 'READY_FOR_SHIPMENT'
                : hasAnyProduced
                  ? 'IN_PRODUCTION'
                  : undefined,
            },
          });
        }
      }

      return {
        message: 'Stock-in completed successfully',
        batch: {
          id: batch.id,
          batch_id: batch.batch_id,
          batch_number: batch.batch_number,
          productionDate: batch.productionDate,
          expirationDate: batch.expirationDate,
          poId: batch.poId,
          documents: documentRecord ? [documentRecord] : [],
        },
        summary: {
          totalPairsReceived: totalReceivedPairs,
          totalPacketsReceived: totalReceivedPackets,
          itemsCount: createdBatchItems.length,
        },
        batchItems: createdBatchItems,
      };
    });
  }

  private addYears(date: Date, years: number): Date {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + years);
    return d;
  }

  private generateBatchId(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `BAT-${y}${m}${d}-${rand}`;
  }

  private generateBatchNumber(): string {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `LOT-${rand}`;
  }

  private generateBarcode(): string {
    const prefix = 'PROD';
    const random = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    return `${prefix}${random}`.slice(0, 13);
  }
}
