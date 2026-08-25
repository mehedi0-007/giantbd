import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VariantProductsService } from '../../products/services/variant-products.service';
import { PreviewStockInDTO, StockInDTO } from '../dto/stock-in.dto';

@Injectable()
export class StockInService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly variantProductsService: VariantProductsService,
  ) {}

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

    // Filter active items with quantity > 0
    const activeItems = dto.items.filter(
      (item) => (item.receivedQty || item.quantity || 0) > 0,
    );

    if (activeItems.length === 0) {
      throw new BadRequestException('At least one item with quantity > 0 must be provided for stock-in');
    }

    // 1. Auto-resolve Master Product & Color if provided
    let masterProduct: any = null;
    let color: any = null;

    if (dto.masterProductId || dto.colorId) {
      const [mp, c] = await Promise.all([
        dto.masterProductId
          ? this.prisma.masterProduct.findUnique({
              where: { id: dto.masterProductId },
            })
          : null,
        dto.colorId
          ? this.prisma.color.findUnique({
              where: { id: dto.colorId },
            })
          : null,
      ]);
      masterProduct = mp;
      color = c;
    }

    // 2. Resolve or Auto-Create Variant Products via VariantProductsService
    for (const item of activeItems) {
      if (!item.variantProductId && item.size) {
        const cleanSize = item.size.trim().toUpperCase();
        const gender = item.gender || dto.gender || 'MALE';

        let existingVariant = null;
        if (dto.masterProductId && dto.colorId) {
          existingVariant = await this.prisma.variantProduct.findFirst({
            where: {
              masterProductId: dto.masterProductId,
              colorId: dto.colorId,
              gender,
              size: cleanSize,
              status: { not: 'DELETED' },
            },
          });
        }

        if (existingVariant) {
          item.variantProductId = existingVariant.id;
        } else {
          // Re-use VariantProductsService to handle standardized variant creation!
          if (!masterProduct || !color) {
            throw new BadRequestException(
              `Cannot auto-create custom size '${cleanSize}' without valid masterProductId and colorId`,
            );
          }

          const createdVariant = await this.variantProductsService.create(
            {
              masterProductId: masterProduct.id,
              colorId: color.id,
              size: cleanSize,
              gender,
              uom: 'PAIR',
              itemsPerPacket: item.itemsPerPacket || dto.itemsPerPacket || 1,
              packingType: 'POLY_BAG',
              costPrice: masterProduct.costPrice || 0,
              sellingPrice: masterProduct.sellingPrice || 0,
              mrp: masterProduct.mrp || 0,
              status: 'ACTIVE',
            },
            masterProduct.creatorId,
          );

          item.variantProductId = createdVariant.id;
        }
      }
    }

    // 3. Resolve Rack IDs to Storage Location IDs if provided
    const rackIdsToResolve = activeItems
      .filter((i) => !i.locationId && i.rackId)
      .map((i) => i.rackId as string);

    if (rackIdsToResolve.length > 0) {
      const rackLocations = await this.prisma.storageLocation.findMany({
        where: { rackId: { in: rackIdsToResolve } },
      });
      const rackLocationMap = new Map(rackLocations.map((l) => [l.rackId!, l.id]));

      for (const item of activeItems) {
        if (!item.locationId && item.rackId && rackLocationMap.has(item.rackId)) {
          item.locationId = rackLocationMap.get(item.rackId);
        }
      }
    }

    // 4. Validate Dates & Generate Batch Identifiers
    const productionDate = new Date(dto.productionDate);
    const expirationDate =
      dto.expirationDate ? new Date(dto.expirationDate) : this.addYears(productionDate, 2);

    const batchId = dto.batch_id?.trim().toUpperCase() || this.generateBatchId(productionDate);
    const batchNumber = dto.batch_number?.trim().toUpperCase() || this.generateBatchNumber();

    const variantIds = [...new Set(activeItems.map((i) => i.variantProductId).filter(Boolean))] as string[];
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
      this.prisma.variantProduct.findMany({
        where: { id: { in: variantIds } },
        include: { masterProduct: true, color: true },
      }),
      this.prisma.storageLocation.findMany({
        where: { id: { in: locationIds } },
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

    // 5. Execute Atomic Bulk Stock-In Transaction
    return this.prisma.$transaction(async (tx) => {
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
        const itemsPerPacket = item.itemsPerPacket || dto.itemsPerPacket || variant.itemsPerPacket || 1;
        const receivedQty =
          item.receivedQty || item.quantity || (item.packetCount ? item.packetCount * itemsPerPacket : itemsPerPacket);
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
          note: dto.note || `Batch stock-in '${batch.batch_id}' into location '${bi.location?.code}'`,
        })),
      });

      await Promise.all(
        Array.from(variantQtyMap.entries()).map(([variantId, qty]) =>
          tx.variantProduct.update({
            where: { id: variantId },
            data: { shippableQuantity: { increment: qty } },
          }),
        ),
      );

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
}
