import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ExecuteStockOutDTO,
  QueryStockOutDTO,
  UpdateStockOutStatusDTO,
} from '../dto/stock-out.dto';

@Injectable()
export class StockOutService {
  constructor(private readonly prisma: PrismaService) {}

  async previewStockOutByPo(poId: string) {
    const po = await this.prisma.pO.findUnique({
      where: { id: poId },
      include: {
        buyer: { select: { id: true, name: true, code: true } },
        lc: { select: { id: true, lcNumber: true } },
        items: {
          include: {
            variantProduct: {
              include: {
                color: { select: { id: true, name: true, code: true } },
                masterProduct: { select: { id: true, name: true, sku: true } },
              },
            },
          },
        },
      },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order '${poId}' not found`);
    }

    const variantIds = po.items.map((i) => i.variantProductId);

    // Fetch all available batch items matching these variants across all warehouse racks (FIFO ordered)
    const availableBatchItems = await this.prisma.batchItem.findMany({
      where: {
        productId: { in: variantIds },
        availableQty: { gt: 0 },
      },
      include: {
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
      orderBy: [{ batch: { productionDate: 'asc' } }, { locationId: 'asc' }],
    });

    // Group available batch items by variantProductId
    const batchItemsByVariant = new Map<string, any[]>();
    for (const bi of availableBatchItems) {
      if (!batchItemsByVariant.has(bi.productId)) {
        batchItemsByVariant.set(bi.productId, []);
      }

      batchItemsByVariant.get(bi.productId)!.push({
        batchItemId: bi.id,
        batchId: bi.batch.id,
        batchCode: bi.batch.batch_id,
        batchNumber: bi.batch.batch_number,
        productionDate: bi.batch.productionDate,
        expirationDate: bi.batch.expirationDate,
        warehouseId: bi.location.warehouse.id,
        warehouseName: bi.location.warehouse.name,
        buildingZone: `${bi.location.warehouse.name} / ${bi.location.zone.name}`,
        subZoneRack: `${bi.location.subZone?.name ?? 'Main'} / ${bi.location.rack?.name ?? bi.location.name ?? 'Rack'}`,
        locationCode: bi.location.code,
        inHand: bi.availableQty,
      });
    }

    const items = po.items.map((item) => {
      const remainingQty = Math.max(0, item.quantity - item.shippedQuantity);
      return {
        poItemId: item.id,
        variantProductId: item.variantProductId,
        masterProductName: item.variantProduct.masterProduct.name,
        sku: item.variantProduct.sku,
        color: item.variantProduct.color.name,
        size: item.variantProduct.size,
        gender: item.variantProduct.gender,
        reqQty: item.quantity,
        approvedQty: item.quantity,
        alreadyIssued: item.shippedQuantity,
        remainingQty,
        availableWarehouseStock:
          batchItemsByVariant.get(item.variantProductId) || [],
      };
    });

    return {
      po: {
        id: po.id,
        poNumber: po.poNumber,
        buyer: po.buyer,
        lc: po.lc,
        totalQuantity: po.totalQuantity,
        status: po.status,
      },
      items,
    };
  }

  async executeStockOut(dto: ExecuteStockOutDTO, issuerId: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item must be provided for stock-out');
    }

    const activeItems = dto.items.filter((i) => i.issueQty > 0);
    if (activeItems.length === 0) {
      throw new BadRequestException('At least one item with issueQty > 0 must be provided');
    }

    const dispatchDate = dto.dispatchDate ? new Date(dto.dispatchDate) : new Date();
    const challanNumber = this.generateChallanNumber(dispatchDate);

    const batchItemIds = [...new Set(activeItems.map((i) => i.batchItemId))];

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch and validate batch items
      const batchItems = await tx.batchItem.findMany({
        where: { id: { in: batchItemIds } },
        include: {
          product: true,
          batch: true,
          location: true,
        },
      });

      const batchItemMap = new Map(batchItems.map((bi) => [bi.id, bi]));

      // 2. Validate availability per batch item
      const variantQtyMap = new Map<string, number>();
      let totalDispatchedQty = 0;

      for (const item of activeItems) {
        const batchItem = batchItemMap.get(item.batchItemId);
        if (!batchItem) {
          throw new NotFoundException(`Batch Item '${item.batchItemId}' not found`);
        }

        if (item.issueQty > batchItem.availableQty) {
          throw new BadRequestException(
            `Requested issue quantity (${item.issueQty}) exceeds available stock (${batchItem.availableQty}) for batch '${batchItem.batch.batch_id}' at location '${batchItem.location.code}'`,
          );
        }

        totalDispatchedQty += item.issueQty;
        const currentSum = variantQtyMap.get(batchItem.productId) || 0;
        variantQtyMap.set(batchItem.productId, currentSum + item.issueQty);
      }

      // 3. Validate variant product shippableQuantity
      const variantProducts = await tx.variantProduct.findMany({
        where: { id: { in: Array.from(variantQtyMap.keys()) } },
      });
      const variantMap = new Map(variantProducts.map((v) => [v.id, v]));

      for (const [variantId, qty] of variantQtyMap.entries()) {
        const variant = variantMap.get(variantId);
        if (!variant) {
          throw new NotFoundException(`Variant Product '${variantId}' not found`);
        }
        if (qty > variant.shippableQuantity) {
          throw new BadRequestException(
            `Total requested issue quantity (${qty}) exceeds shippable catalog stock (${variant.shippableQuantity}) for SKU '${variant.sku}'`,
          );
        }
      }

      // 4. Resolve PO & Buyer if poId is provided
      let buyerId = dto.buyerId || null;
      let partialSequence = 1;

      if (dto.poId) {
        const po = await tx.pO.findUnique({
          where: { id: dto.poId },
          include: { buyer: true },
        });

        if (!po) {
          throw new NotFoundException(`Purchase Order '${dto.poId}' not found`);
        }

        if (!buyerId && po.buyerId) {
          buyerId = po.buyerId;
        }

        const existingStockOutsCount = await tx.stockOut.count({
          where: { poId: dto.poId, status: { not: 'CANCELLED' } },
        });
        partialSequence = existingStockOutsCount + 1;
      }

      // 5. Create StockOut Header Record
      const stockOut = await tx.stockOut.create({
        data: {
          challanNumber,
          type: dto.type || (dto.poId ? 'PO_SHIPMENT' : 'DIRECT_SALE'),
          status: 'ISSUED',
          partialSequence,
          dispatchDate,
          poId: dto.poId || null,
          buyerId,
          destination: dto.destination || null,
          note: dto.note || null,
          issuerId,
        },
      });

      // 6. Create StockOutItem Records
      const stockOutItemsData = activeItems.map((item) => {
        const batchItem = batchItemMap.get(item.batchItemId)!;
        return {
          stockOutId: stockOut.id,
          variantProductId: batchItem.productId,
          batchItemId: batchItem.id,
          quantity: item.issueQty,
        };
      });

      const createdStockOutItems = await tx.stockOutItem.createManyAndReturn({
        data: stockOutItemsData,
        include: {
          variantProduct: {
            select: {
              id: true,
              name: true,
              sku: true,
              size: true,
              color: { select: { name: true } },
            },
          },
          batchItem: {
            select: {
              id: true,
              batch: { select: { id: true, batch_id: true, batch_number: true } },
              location: { select: { id: true, code: true, name: true } },
            },
          },
        },
      });

      // 7. Atomically decrement BatchItem.availableQty in deterministic ID order (prevents deadlocks)
      const sortedActiveItems = [...activeItems].sort((a, b) =>
        a.batchItemId.localeCompare(b.batchItemId),
      );

      for (const item of sortedActiveItems) {
        const updateResult = await tx.batchItem.updateMany({
          where: {
            id: item.batchItemId,
            availableQty: { gte: item.issueQty },
          },
          data: { availableQty: { decrement: item.issueQty } },
        });

        if (updateResult.count === 0) {
          throw new ConflictException(
            `Insufficient stock for batch item '${item.batchItemId}' due to concurrent dispatch. Please refresh stock and retry.`,
          );
        }
      }

      // 8. Atomically decrement VariantProduct.shippableQuantity in deterministic ID order
      const sortedVariantEntries = Array.from(variantQtyMap.entries()).sort(
        ([a], [b]) => a.localeCompare(b),
      );

      for (const [variantId, qty] of sortedVariantEntries) {
        const variantUpdateResult = await tx.variantProduct.updateMany({
          where: {
            id: variantId,
            shippableQuantity: { gte: qty },
          },
          data: { shippableQuantity: { decrement: qty } },
        });

        if (variantUpdateResult.count === 0) {
          throw new ConflictException(
            `Insufficient shippable catalog stock for variant '${variantId}' due to concurrent dispatch.`,
          );
        }
      }

      // 9. Bulk Insert InventoryMovement Audit Logs
      const movementType =
        dto.type === 'DAMAGE_SCRAP'
          ? ('DAMAGE' as const)
          : dto.type === 'SAMPLE_DISPATCH'
            ? ('TRANSFER' as const)
            : ('SALE' as const);

      await tx.inventoryMovement.createMany({
        data: activeItems.map((item) => {
          const bi = batchItemMap.get(item.batchItemId)!;
          return {
            inventoryBatchItemId: item.batchItemId,
            type: movementType,
            quantity: item.issueQty,
            referenceId: stockOut.id,
            note:
              dto.note ||
              `Dispatched via Challan '${stockOut.challanNumber}' from location '${bi.location.code}'`,
          };
        }),
      });

      // 10. Update POItem shippedQuantity and PO/LC status
      if (dto.poId) {
        await Promise.all(
          Array.from(variantQtyMap.entries()).map(([variantId, qty]) =>
            tx.pOItem.updateMany({
              where: { poId: dto.poId, variantProductId: variantId },
              data: { shippedQuantity: { increment: qty } },
            }),
          ),
        );

        const poItems = await tx.pOItem.findMany({ where: { poId: dto.poId } });
        if (poItems.length > 0) {
          const isAllFulfilled = poItems.every((i) => i.shippedQuantity >= i.quantity);
          const hasAnyShipment = poItems.some((i) => i.shippedQuantity > 0);

          const updatedPo = await tx.pO.update({
            where: { id: dto.poId },
            data: {
              status: isAllFulfilled
                ? 'COMPLETED'
                : hasAnyShipment
                  ? 'PARTIALLY_SHIPPED'
                  : undefined,
            },
          });

          if (isAllFulfilled && updatedPo.lcId) {
            const lcPOs = await tx.pO.findMany({ where: { lcId: updatedPo.lcId } });
            const isAllLcCompleted = lcPOs.every((p) => p.status === 'COMPLETED');
            if (isAllLcCompleted) {
              await tx.lC.update({
                where: { id: updatedPo.lcId },
                data: { status: 'FULFILLED' },
              });
            }
          }
        }
      }

      return {
        message: 'Stock-out completed successfully',
        challan: {
          id: stockOut.id,
          challanNumber: stockOut.challanNumber,
          type: stockOut.type,
          status: stockOut.status,
          partialSequence: stockOut.partialSequence,
          dispatchDate: stockOut.dispatchDate,
          poId: stockOut.poId,
          buyerId: stockOut.buyerId,
          destination: stockOut.destination,
          note: stockOut.note,
          items: createdStockOutItems,
        },
        summary: {
          totalDispatchedQty,
          itemsCount: createdStockOutItems.length,
        },
        items: createdStockOutItems,
      };
    });
  }

  async findAll(query: QueryStockOutDTO) {
    const page = Number(query.page) || 1;
    const per_page = Number(query.per_page) || 20;
    const skip = (page - 1) * per_page;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { challanNumber: { contains: query.search, mode: 'insensitive' } },
        { po: { poNumber: { contains: query.search, mode: 'insensitive' } } },
        { buyer: { name: { contains: query.search, mode: 'insensitive' } } },
        { destination: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.poId) where.poId = query.poId;
    if (query.buyerId) where.buyerId = query.buyerId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    if (query.fromDate || query.toDate) {
      where.dispatchDate = {};
      if (query.fromDate) where.dispatchDate.gte = new Date(query.fromDate);
      if (query.toDate) where.dispatchDate.lte = new Date(query.toDate);
    }

    const [total, stockOuts] = await Promise.all([
      this.prisma.stockOut.count({ where }),
      this.prisma.stockOut.findMany({
        where,
        skip,
        take: per_page,
        include: {
          po: {
            select: {
              id: true,
              poNumber: true,
              lc: { select: { id: true, lcNumber: true } },
            },
          },
          buyer: { select: { id: true, name: true, code: true } },
          issuer: { select: { id: true, name: true, email: true } },
          _count: { select: { items: true } },
        },
        orderBy: { dispatchDate: 'desc' },
      }),
    ]);

    const formatted = stockOuts.map((so) => {
      return {
        id: so.id,
        challanNumber: so.challanNumber,
        type: so.type,
        status: so.status,
        partialSequence: so.partialSequence,
        dispatchDate: so.dispatchDate,
        po: so.po,
        buyer: so.buyer,
        destination: so.destination,
        receiptDocument: so.receiptDocument,
        note: so.note,
        itemsCount: so._count.items,
        issuer: so.issuer,
        createdAt: so.createdAt,
        updatedAt: so.updatedAt,
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

  async findById(id: string) {
    const stockOut = await this.prisma.stockOut.findUnique({
      where: { id },
      include: {
        po: {
          include: {
            buyer: true,
            lc: true,
          },
        },
        buyer: true,
        issuer: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            variantProduct: {
              include: {
                color: true,
                masterProduct: { select: { id: true, name: true, sku: true } },
              },
            },
            batchItem: {
              include: {
                batch: true,
                location: {
                  include: {
                    warehouse: true,
                    zone: true,
                    subZone: true,
                    rack: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!stockOut) {
      throw new NotFoundException(`Stock-Out record '${id}' not found`);
    }

    const totalQuantity = stockOut.items.reduce((sum, i) => sum + i.quantity, 0);

    return {
      data: {
        ...stockOut,
        totalQuantity,
        itemsCount: stockOut.items.length,
      },
    };
  }

  async updateStatus(
    id: string,
    dto: UpdateStockOutStatusDTO,
    file?: Express.Multer.File,
  ) {
    const stockOut = await this.prisma.stockOut.findUnique({
      where: { id },
    });

    if (!stockOut) {
      throw new NotFoundException(`Stock-Out record '${id}' not found`);
    }

    // Enforce Forward-Only Status State Machine
    const allowedTransitions: Record<string, string[]> = {
      ISSUED: ['DELIVERED', 'CANCELLED'],
      DELIVERED: ['PAYMENT_RECEIVED'],
      PAYMENT_RECEIVED: [],
      CANCELLED: [],
    };

    const validNextStatuses = allowedTransitions[stockOut.status] || [];

    if (!validNextStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition: Cannot transition Stock-Out status from '${stockOut.status}' to '${dto.status}'`,
      );
    }

    // If transitioning to CANCELLED, trigger reversal
    if (dto.status === 'CANCELLED') {
      return this.cancel(id, dto.note);
    }

    const normalizedPath = file ? file.path.replace(/\\/g, '/') : undefined;

    const updated = await this.prisma.stockOut.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.note && { note: dto.note }),
        ...(normalizedPath && { receiptDocument: normalizedPath }),
      },
    });

    return {
      message: `Stock-Out status successfully updated to '${dto.status}'`,
      data: updated,
    };
  }

  async cancel(id: string, note?: string) {
    const stockOut = await this.prisma.stockOut.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!stockOut) {
      throw new NotFoundException(`Stock-Out record '${id}' not found`);
    }

    if (stockOut.status !== 'ISSUED') {
      throw new BadRequestException(
        `Only Stock-Outs in 'ISSUED' status can be cancelled. Current status is '${stockOut.status}'`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Restore BatchItem availableQty
      await Promise.all(
        stockOut.items.map((item) =>
          tx.batchItem.update({
            where: { id: item.batchItemId },
            data: { availableQty: { increment: item.quantity } },
          }),
        ),
      );

      // 2. Restore VariantProduct shippableQuantity
      const variantQtyMap = new Map<string, number>();
      for (const item of stockOut.items) {
        const cur = variantQtyMap.get(item.variantProductId) || 0;
        variantQtyMap.set(item.variantProductId, cur + item.quantity);
      }

      await Promise.all(
        Array.from(variantQtyMap.entries()).map(([variantId, qty]) =>
          tx.variantProduct.update({
            where: { id: variantId },
            data: { shippableQuantity: { increment: qty } },
          }),
        ),
      );

      // 3. Rollback POItem shippedQuantity and PO status if attached to PO
      if (stockOut.poId) {
        await Promise.all(
          Array.from(variantQtyMap.entries()).map(([variantId, qty]) =>
            tx.pOItem.updateMany({
              where: { poId: stockOut.poId!, variantProductId: variantId },
              data: { shippedQuantity: { decrement: qty } },
            }),
          ),
        );

        const poItems = await tx.pOItem.findMany({
          where: { poId: stockOut.poId },
        });

        const hasAnyShipment = poItems.some((i) => i.shippedQuantity > 0);
        await tx.pO.update({
          where: { id: stockOut.poId },
          data: {
            status: hasAnyShipment ? 'PARTIALLY_SHIPPED' : 'IN_PRODUCTION',
          },
        });
      }

      // 4. Record InventoryMovement reversal log
      await tx.inventoryMovement.createMany({
        data: stockOut.items.map((item) => ({
          inventoryBatchItemId: item.batchItemId,
          type: 'RETURN' as const,
          quantity: item.quantity,
          referenceId: stockOut.id,
          note: note || `Stock-Out '${stockOut.challanNumber}' was cancelled/reversed`,
        })),
      });

      // 5. Update status to CANCELLED
      const updated = await tx.stockOut.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          ...(note && { note }),
        },
      });

      return {
        message: `Stock-Out '${stockOut.challanNumber}' cancelled and inventory reversed successfully`,
        data: updated,
      };
    });
  }

  private generateChallanNumber(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    // Use cryptographic randomness to prevent collisions under concurrent requests
    const rand = randomBytes(3).toString('hex').toUpperCase(); // 6 hex chars = 16^6 = 16M possibilities
    return `CHAL-${y}${m}${d}-${rand}`;
  }
}
