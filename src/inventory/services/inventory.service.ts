import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QueryBatchesDTO,
  QueryMovementsDTO,
  QueryStockDTO,
} from '../dto/stock-query.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

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
