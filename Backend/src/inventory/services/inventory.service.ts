import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QueryBatchesDTO,
  QueryMovementsDTO,
  QueryStockDTO,
  UpdateBatchDTO,
  UpdateBatchItemDTO,
} from '../dto/stock-query.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) { }

  async findAllBatches(query: QueryBatchesDTO) {
    const per_page = Number(query.per_page) || 20;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { batch_id: { contains: query.search, mode: 'insensitive' } },
        { batch_number: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.poId) where.poId = query.poId;

    if (query.productId) {
      where.batchItems = {
        some: { productId: query.productId },
      };
    }

    if (query.productionDateFrom || query.productionDateTo) {
      where.productionDate = {};
      if (query.productionDateFrom) where.productionDate.gte = new Date(query.productionDateFrom);
      if (query.productionDateTo) where.productionDate.lte = new Date(query.productionDateTo);
    }

    const [total, batches] = await Promise.all([
      this.prisma.batch.count({ where }),
      this.prisma.batch.findMany({
        where,
        skip,
        take: per_page,
        include: {
          po: {
            select: {
              id: true,
              poNumber: true,
              buyer: { select: { id: true, name: true, code: true } },
            },
          },
          documents: {
            select: {
              id: true,
              name: true,
              path: true,
              mimeType: true,
              size: true,
              createdAt: true,
            },
          },
          batchItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  size: true,
                  color: { select: { name: true, code: true } },
                },
              },
              location: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formatted = batches.map((batch) => {
      const totalReceivedQty = batch.batchItems.reduce((sum, item) => sum + item.receivedQty, 0);
      const totalAvailableQty = batch.batchItems.reduce((sum, item) => sum + item.availableQty, 0);
      const totalPackets = batch.batchItems.reduce((sum, item) => sum + item.packetCount, 0);

      return {
        id: batch.id,
        batch_id: batch.batch_id,
        batch_number: batch.batch_number,
        productionDate: batch.productionDate,
        expirationDate: batch.expirationDate,
        po: batch.po,
        summary: {
          totalReceivedQty,
          totalAvailableQty,
          totalPackets,
          itemsCount: batch.batchItems.length,
        },
        documents: batch.documents,
        batchItems: batch.batchItems,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
      };
    });

    return {
      data: formatted,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async findBatchById(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: {
        documents: {
          select: {
            id: true,
            name: true,
            path: true,
            mimeType: true,
            size: true,
            createdAt: true,
          },
        },
        po: {
          include: {
            buyer: true,
          },
        },
        batchItems: {
          include: {
            product: {
              include: {
                color: true,
                masterProduct: true,
              },
            },
            location: {
              include: {
                warehouse: true,
                zone: true,
                subZone: true,
                rack: true,
              },
            },
            inventoryMovements: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    const totalReceivedQty = batch.batchItems.reduce((sum, item) => sum + item.receivedQty, 0);
    const totalAvailableQty = batch.batchItems.reduce((sum, item) => sum + item.availableQty, 0);
    const totalPackets = batch.batchItems.reduce((sum, item) => sum + item.packetCount, 0);

    return {
      data: {
        ...batch,
        summary: {
          totalReceivedQty,
          totalAvailableQty,
          totalPackets,
          itemsCount: batch.batchItems.length,
        },
      },
    };
  }

  async updateBatch(id: string, dto: UpdateBatchDTO) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
    });

    if (!batch) {
      throw new NotFoundException(`Batch '${id}' not found`);
    }

    if (dto.poId) {
      const po = await this.prisma.pO.findUnique({ where: { id: dto.poId } });
      if (!po) throw new NotFoundException(`Purchase Order '${dto.poId}' not found`);
    }

    const updated = await this.prisma.batch.update({
      where: { id },
      data: {
        ...(dto.batch_number && { batch_number: dto.batch_number.trim().toUpperCase() }),
        ...(dto.productionDate && { productionDate: new Date(dto.productionDate) }),
        ...(dto.expirationDate && { expirationDate: new Date(dto.expirationDate) }),
        ...(dto.poId !== undefined && { poId: dto.poId || null }),
      },
      include: {
        po: { select: { id: true, poNumber: true, buyer: { select: { name: true } } } },
      },
    });

    return {
      message: 'Batch updated successfully',
      data: updated,
    };
  }

  async updateBatchItem(id: string, dto: UpdateBatchItemDTO) {
    return this.prisma.$transaction(async (tx) => {
      const batchItem = await tx.batchItem.findUnique({
        where: { id },
        include: {
          product: {
            include: {
              color: true,
              masterProduct: true,
            },
          },
          batch: true,
          location: true,
        },
      });

      if (!batchItem) {
        throw new NotFoundException(`Batch Item '${id}' not found`);
      }

      let currentProductId = batchItem.productId;
      let currentLocationId = batchItem.locationId;
      let currentReceivedQty = batchItem.receivedQty;
      let currentAvailableQty = batchItem.availableQty;
      let currentItemsPerPacket = batchItem.itemsPerPacket;
      let currentPacketCount = batchItem.packetCount;

      // 1. Handle Location / Rack Change (Transfer)
      let targetLocationId: string | null = null;
      if (dto.locationId) {
        targetLocationId = dto.locationId;
      } else if (dto.rackId) {
        const rackLocation = await tx.storageLocation.findFirst({
          where: { rackId: dto.rackId, status: { not: 'DELETED' } },
        });
        if (!rackLocation) {
          throw new NotFoundException(`Storage location for rack '${dto.rackId}' not found`);
        }
        targetLocationId = rackLocation.id;
      }

      if (targetLocationId && targetLocationId !== batchItem.locationId) {
        const destLocation = await tx.storageLocation.findUnique({
          where: { id: targetLocationId },
        });
        if (!destLocation) {
          throw new NotFoundException(`Destination storage location '${targetLocationId}' not found`);
        }

        currentLocationId = targetLocationId;

        await tx.inventoryMovement.create({
          data: {
            inventoryBatchItemId: batchItem.id,
            type: 'TRANSFER',
            quantity: batchItem.availableQty,
            referenceId: batchItem.batchId,
            note: dto.note || `Batch item moved from location '${batchItem.location.code}' to '${destLocation.code}'`,
          },
        });
      }

      // 2. Handle Variant / Color / Size Re-assignment
      const targetColorId = dto.colorId || batchItem.product.colorId;
      const targetSize = (dto.size || batchItem.product.size).trim().toUpperCase();

      if (
        targetColorId !== batchItem.product.colorId ||
        targetSize !== batchItem.product.size
      ) {
        const targetVariant = await tx.variantProduct.findFirst({
          where: {
            masterProductId: batchItem.product.masterProductId,
            colorId: targetColorId,
            size: targetSize,
            status: { not: 'DELETED' },
          },
        });

        if (!targetVariant) {
          throw new BadRequestException(
            `Target variant product with color '${targetColorId}' and size '${targetSize}' does not exist in catalog`,
          );
        }

        // Rebalance shippable stock between old and new variants
        await tx.variantProduct.update({
          where: { id: batchItem.productId },
          data: { shippableQuantity: { decrement: batchItem.availableQty } },
        });

        await tx.variantProduct.update({
          where: { id: targetVariant.id },
          data: { shippableQuantity: { increment: batchItem.availableQty } },
        });

        currentProductId = targetVariant.id;

        await tx.inventoryMovement.create({
          data: {
            inventoryBatchItemId: batchItem.id,
            type: 'ADJUSTMENT',
            quantity: batchItem.availableQty,
            referenceId: batchItem.batchId,
            note: dto.note || `Variant re-assigned from '${batchItem.product.sku}' to '${targetVariant.sku}'`,
          },
        });
      }

      // 3. Handle Quantity Correction (Audit Adjustment)
      const requestedQty =
        dto.receivedQty !== undefined
          ? dto.receivedQty
          : dto.quantity !== undefined
            ? dto.quantity
            : undefined;

      if (requestedQty !== undefined && requestedQty !== batchItem.receivedQty) {
        const delta = requestedQty - batchItem.receivedQty;

        if (delta < 0 && batchItem.availableQty + delta < 0) {
          throw new BadRequestException(
            `Cannot reduce quantity by ${Math.abs(delta)}: only ${batchItem.availableQty} available (remaining stock already shipped/issued)`,
          );
        }

        currentReceivedQty = requestedQty;
        currentAvailableQty = batchItem.availableQty + delta;

        // Update shippableQuantity on VariantProduct
        await tx.variantProduct.update({
          where: { id: currentProductId },
          data: { shippableQuantity: { increment: delta } },
        });

        await tx.inventoryMovement.create({
          data: {
            inventoryBatchItemId: batchItem.id,
            type: 'ADJUSTMENT',
            quantity: delta,
            referenceId: batchItem.batchId,
            note: dto.note || `Quantity adjusted from ${batchItem.receivedQty} to ${requestedQty}`,
          },
        });
      }

      // 4. Handle Packaging update
      if (dto.itemsPerPacket) {
        currentItemsPerPacket = dto.itemsPerPacket;
        currentPacketCount = Math.ceil(currentReceivedQty / currentItemsPerPacket);
      } else if (requestedQty !== undefined) {
        currentPacketCount = Math.ceil(currentReceivedQty / currentItemsPerPacket);
      }

      // 5. Update BatchItem
      const updated = await tx.batchItem.update({
        where: { id },
        data: {
          productId: currentProductId,
          locationId: currentLocationId,
          receivedQty: currentReceivedQty,
          availableQty: currentAvailableQty,
          itemsPerPacket: currentItemsPerPacket,
          packetCount: currentPacketCount,
        },
        include: {
          product: {
            include: {
              color: true,
              masterProduct: true,
            },
          },
          location: {
            include: {
              warehouse: true,
              zone: true,
              subZone: true,
              rack: true,
            },
          },
          batch: true,
        },
      });

      return {
        message: 'Batch item updated successfully',
        data: updated,
      };
    });
  }

  async getStockOverview(query: QueryStockDTO) {
    const per_page = Number(query.per_page) || 50;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {};

    if (query.variantProductId) where.productId = query.variantProductId;
    if (query.locationId) where.locationId = query.locationId;

    if (query.masterProductId) {
      where.product = { masterProductId: query.masterProductId };
    }

    if (query.warehouseId || query.zoneId || query.subZoneId || query.rackId) {
      where.location = {};
      if (query.warehouseId) where.location.warehouseId = query.warehouseId;
      if (query.zoneId) where.location.zoneId = query.zoneId;
      if (query.subZoneId) where.location.subZoneId = query.subZoneId;
      if (query.rackId) where.location.rackId = query.rackId;
    }

    const [total, items] = await Promise.all([
      this.prisma.batchItem.count({ where }),
      this.prisma.batchItem.findMany({
        where,
        skip,
        take: per_page,
        include: {
          product: {
            include: {
              color: true,
              masterProduct: { select: { id: true, name: true, sku: true } },
            },
          },
          batch: {
            select: {
              id: true,
              batch_id: true,
              batch_number: true,
              productionDate: true,
              expirationDate: true,
            },
          },
          location: {
            include: {
              warehouse: { select: { id: true, name: true, code: true } },
              zone: { select: { id: true, name: true, code: true } },
              subZone: { select: { id: true, name: true, code: true } },
              rack: { select: { id: true, name: true, code: true } },
            },
          },
        },
        orderBy: [{ productId: 'asc' }, { locationId: 'asc' }],
      }),
    ]);

    return {
      data: items,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async getMovementsLedger(query: QueryMovementsDTO) {
    const per_page = Number(query.per_page) || 50;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {};

    if (query.type) where.type = query.type;
    if (query.inventoryBatchItemId) where.inventoryBatchItemId = query.inventoryBatchItemId;

    if (query.productId) {
      where.inventoryBatchItem = {
        productId: query.productId,
      };
    }

    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }

    const [total, movements] = await Promise.all([
      this.prisma.inventoryMovement.count({ where }),
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take: per_page,
        include: {
          inventoryBatchItem: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  size: true,
                  color: { select: { name: true, code: true } },
                },
              },
              batch: {
                select: {
                  id: true,
                  batch_id: true,
                  batch_number: true,
                },
              },
              location: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: movements,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }
}
