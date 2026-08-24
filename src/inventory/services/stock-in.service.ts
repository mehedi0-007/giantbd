import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PreviewStockInDTO, StockInDTO } from '../dto/stock-in.dto';

@Injectable()
export class StockInService {
  constructor(private readonly prisma: PrismaService) {}

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

    // Auto-calculate dates
    const productionDate = new Date(dto.productionDate);
    const expirationDate =
      dto.expirationDate ? new Date(dto.expirationDate) : this.addYears(productionDate, 2);

    // Auto-generate batch identifiers if omitted
    const batchId = dto.batch_id?.trim().toUpperCase() || this.generateBatchId(productionDate);
    const batchNumber = dto.batch_number?.trim().toUpperCase() || this.generateBatchNumber();

    // Validate and collect variant IDs & location IDs
    const variantIds = [...new Set(dto.items.map((i) => i.variantProductId))];
    const locationIds = [
      ...new Set(
        dto.items.map((i) => i.locationId || dto.defaultLocationId).filter(Boolean),
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

    for (const item of dto.items) {
      const variant = variantMap.get(item.variantProductId);
      if (!variant) {
        throw new NotFoundException(`Variant Product '${item.variantProductId}' not found`);
      }

      const targetLocationId = item.locationId || dto.defaultLocationId;
      if (!targetLocationId || !locationMap.has(targetLocationId)) {
        throw new NotFoundException(`Storage Location '${targetLocationId}' not found`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create or Find Batch
      const batch = await tx.batch.upsert({
        where: {
          batch_id_productionDate: {
            batch_id: batchId,
            productionDate,
          },
        },
        update: {
          batch_number: batchNumber,
          expirationDate,
          poId: dto.poId || null,
        },
        create: {
          batch_id: batchId,
          batch_number: batchNumber,
          productionDate,
          expirationDate,
          poId: dto.poId || null,
        },
      });

      let totalReceivedPairs = 0;
      let totalReceivedPackets = 0;
      const createdBatchItems = [];

      // 2. Process each item in the Size Matrix
      for (const item of dto.items) {
        const variant = variantMap.get(item.variantProductId)!;
        const targetLocationId = (item.locationId || dto.defaultLocationId)!;
        const location = locationMap.get(targetLocationId)!;

        const itemsPerPacket = item.itemsPerPacket || variant.itemsPerPacket || 1;
        const receivedQty =
          item.receivedQty || (item.packetCount ? item.packetCount * itemsPerPacket : itemsPerPacket);
        const packetCount =
          item.packetCount || Math.ceil(receivedQty / itemsPerPacket);

        totalReceivedPairs += receivedQty;
        totalReceivedPackets += packetCount;

        // Upsert BatchItem (supports adding to same rack/batch)
        const batchItem = await tx.batchItem.upsert({
          where: {
            productId_batchId_locationId: {
              productId: variant.id,
              batchId: batch.id,
              locationId: targetLocationId,
            },
          },
          update: {
            receivedQty: { increment: receivedQty },
            availableQty: { increment: receivedQty },
            packetCount: { increment: packetCount },
            itemsPerPacket,
          },
          create: {
            productId: variant.id,
            batchId: batch.id,
            locationId: targetLocationId,
            receivedQty,
            availableQty: receivedQty,
            itemsPerPacket,
            packetCount,
          },
          include: {
            product: { select: { id: true, name: true, sku: true, size: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        });

        // 3. Update Variant Shippable Stock
        await tx.variantProduct.update({
          where: { id: variant.id },
          data: {
            shippableQuantity: { increment: receivedQty },
          },
        });

        // 4. Create Immutable Movement Ledger Entry
        await tx.inventoryMovement.create({
          data: {
            inventoryBatchItemId: batchItem.id,
            type: 'RECEIVED',
            quantity: receivedQty,
            referenceId: batch.id,
            note: dto.note || `Batch stock-in '${batch.batch_id}' into location '${location.code}'`,
          },
        });

        createdBatchItems.push(batchItem);
      }

      // 5. Update PO Item delivered quantities if linked & auto-advance PO status
      if (dto.poId) {
        for (const item of dto.items) {
          const variant = variantMap.get(item.variantProductId)!;
          const itemsPerPacket = item.itemsPerPacket || variant.itemsPerPacket || 1;
          const receivedQty =
            item.receivedQty || (item.packetCount ? item.packetCount * itemsPerPacket : itemsPerPacket);

          await tx.pOItem.updateMany({
            where: {
              poId: dto.poId,
              variantProductId: variant.id,
            },
            data: {
              shippedQuantity: { increment: receivedQty },
            },
          });
        }

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
    const rand = Math.floor(100 + Math.random() * 900);
    return `BAT-${y}${m}${d}-${rand}`;
  }

  private generateBatchNumber(): string {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `LOT-${rand}`;
  }
}
