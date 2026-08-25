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

  async executeStockIn(dto: StockInDTO) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item must be provided for stock-in');
    }

    // 1. Filter active items with quantity > 0
    const activeItems = dto.items.filter(
      (item) => (item.receivedQty || item.quantity || 0) > 0,
    );

    if (activeItems.length === 0) {
      throw new BadRequestException(
        'At least one item with quantity > 0 must be provided for stock-in',
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

        // Single query for all candidate sizes (Eliminating N+1 queries)
        const existingVariants = await tx.variantProduct.findMany({
          where: {
            masterProductId: dto.masterProductId,
            colorId: dto.colorId,
            size: { in: candidateSizes },
            status: { not: 'DELETED' },
          },
        });

        const variantMapByKey = new Map(
          existingVariants.map((v) => [`${v.gender}_${v.size}`, v]),
        );

        for (const item of customItems) {
          const cleanSize = item.size!.trim().toUpperCase();
          const gender = item.gender || dto.gender || 'MALE';
          const key = `${gender}_${cleanSize}`;

          if (variantMapByKey.has(key)) {
            item.variantProductId = variantMapByKey.get(key)!.id;
          } else {
            // Auto-create on-the-fly atomically inside this transaction
            const cleanSku = `${masterProduct.sku}-${color.name.toUpperCase().replace(/\s+/g, '')}-${cleanSize}`;
            const cleanName = `${masterProduct.name} - ${color.name} / ${cleanSize}`;
            const barcode = this.generateBarcode();

            const createdVariant = await tx.variantProduct.create({
              data: {
                name: cleanName,
                sku: cleanSku,
                barcode,
                size: cleanSize,
                colorId: color.id,
                gender,
                uom: 'PAIR',
                itemsPerPacket: item.itemsPerPacket || dto.itemsPerPacket || 1,
                packingType: 'POLY_BAG',
                costPrice: 0,
                sellingPrice: 0,
                mrp: 0,
                status: 'ACTIVE',
                masterProductId: masterProduct.id,
                categoryId: masterProduct.categoryId,
                subCategoryId: masterProduct.subCategoryId,
                creatorId: masterProduct.creatorId,
              },
            });

            variantMapByKey.set(key, createdVariant);
            item.variantProductId = createdVariant.id;
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

      // Step F: Increment shippable stock on variants
      await Promise.all(
        Array.from(variantQtyMap.entries()).map(([variantId, qty]) =>
          tx.variantProduct.update({
            where: { id: variantId },
            data: { shippableQuantity: { increment: qty } },
          }),
        ),
      );

      // Step G: Auto advance PO progress if poId is attached
      if (dto.poId) {
        await Promise.all(
          Array.from(variantQtyMap.entries()).map(([variantId, qty]) =>
            tx.pOItem.updateMany({
              where: {
                poId: dto.poId,
                variantProductId: variantId,
              },
              data: {
                shippedQuantity: { increment: qty },
              },
            }),
          ),
        );

        const poItems = await tx.pOItem.findMany({ where: { poId: dto.poId } });
        if (poItems.length > 0) {
          const isAllFulfilled = poItems.every((i) => i.shippedQuantity >= i.quantity);
          const hasAnyStock = poItems.some((i) => i.shippedQuantity > 0);

          await tx.pO.update({
            where: { id: dto.poId },
            data: {
              status: isAllFulfilled
                ? 'READY_FOR_SHIPMENT'
                : hasAnyStock
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
