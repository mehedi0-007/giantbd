import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddPOItemsDTO, CreatePODTO, QueryPODTO, UpdatePODTO } from './dto/po.dto';

@Injectable()
export class POService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePODTO) {
    const cleanPoNumber = dto.poNumber.trim().toUpperCase();

    if (!dto.lcId) {
      throw new BadRequestException('Purchase Order must be linked to an active Letter of Credit (LC)');
    }

    const lc = await this.prisma.lC.findFirst({
      where: { id: dto.lcId, status: { notIn: ['EXPIRED', 'CANCELLED'] } },
      include: { buyer: true },
    });

    if (!lc) {
      throw new NotFoundException('Valid active Letter of Credit (LC) not found');
    }

    const isExist = await this.prisma.pO.findUnique({
      where: { poNumber: cleanPoNumber },
    });

    if (isExist) {
      throw new ConflictException(`Purchase Order '${cleanPoNumber}' already exists`);
    }

    const items = dto.items ?? [];
    if (items.length > 0) {
      const variantIds = items.map((i) => i.variantProductId);
      const validVariants = await this.prisma.variantProduct.findMany({
        where: { id: { in: variantIds }, status: { not: 'DELETED' } },
        select: { id: true },
      });

      if (validVariants.length !== variantIds.length) {
        throw new BadRequestException('One or more Variant Products not found or are deleted');
      }
    }

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    return this.prisma.$transaction(async (tx) => {
      const po = await tx.pO.create({
        data: {
          poNumber: cleanPoNumber,
          buyerId: lc.buyerId,
          lcId: lc.id,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
          totalQuantity,
          status: dto.status ?? 'DRAFT',
          remarks: dto.remarks?.trim() ?? null,
        },
      });

      if (items.length > 0) {
        await tx.pOItem.createMany({
          data: items.map((item) => ({
            poId: po.id,
            variantProductId: item.variantProductId,
            quantity: item.quantity,
            shippedQuantity: 0,
          })),
        });
      }

      if (dto.lcId) {
        await tx.lC.update({
          where: { id: dto.lcId },
          data: { status: 'IN_PROGRESS' },
        });
      }

      return this.findById(po.id, tx);
    });
  }

  async findAll(query: QueryPODTO) {
    const per_page = Number(query.per_page) || 20;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.buyerId) {
      where.buyerId = query.buyerId;
    }

    if (query.lcId) {
      where.lcId = query.lcId;
    }

    if (query.search) {
      where.OR = [
        { poNumber: { contains: query.search, mode: 'insensitive' } },
        { buyer: { name: { contains: query.search, mode: 'insensitive' } } },
        { buyer: { code: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.orderDateFrom || query.orderDateTo) {
      where.orderDate = where.orderDate || {};
      if (query.orderDateFrom) where.orderDate.gte = new Date(query.orderDateFrom);
      if (query.orderDateTo) where.orderDate.lte = new Date(query.orderDateTo);
    }

    if (query.deliveryDateFrom || query.deliveryDateTo) {
      where.deliveryDate = where.deliveryDate || {};
      if (query.deliveryDateFrom) where.deliveryDate.gte = new Date(query.deliveryDateFrom);
      if (query.deliveryDateTo) where.deliveryDate.lte = new Date(query.deliveryDateTo);
    }

    const [total, pos] = await Promise.all([
      this.prisma.pO.count({ where }),
      this.prisma.pO.findMany({
        where,
        skip,
        take: per_page,
        include: {
          buyer: { select: { id: true, name: true, code: true, country: true } },
          lc: { select: { id: true, lcNumber: true, status: true } },
          items: {
            select: {
              quantity: true,
              shippedQuantity: true,
            },
          },
          _count: {
            select: { batches: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formatted = pos.map((po) => {
      const totalOrdered = po.totalQuantity;
      const totalShipped = po.items.reduce((sum, i) => sum + i.shippedQuantity, 0);
      const fulfillmentRate =
        totalOrdered > 0 ? Number(((totalShipped / totalOrdered) * 100).toFixed(1)) : 0;

      return {
        id: po.id,
        poNumber: po.poNumber,
        buyer: po.buyer,
        lc: po.lc,
        orderDate: po.orderDate,
        deliveryDate: po.deliveryDate,
        totalQuantity: po.totalQuantity,
        totalShippedQuantity: totalShipped,
        fulfillmentRate,
        status: po.status,
        remarks: po.remarks,
        itemsCount: po.items.length,
        batchesCount: po._count.batches,
        createdAt: po.createdAt,
        updatedAt: po.updatedAt,
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

  async findById(id: string, prismaClient: any = this.prisma) {
    const po = await prismaClient.pO.findUnique({
      where: { id },
      include: {
        buyer: true,
        lc: true,
        items: {
          include: {
            variantProduct: {
              include: {
                color: true,
                masterProduct: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    category: { select: { name: true } },
                    subCategory: { select: { name: true } },
                    material: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        batches: {
          include: {
            batchItems: {
              include: {
                location: true,
                product: { select: { sku: true, size: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    const totalOrdered = po.totalQuantity;
    const totalShipped = po.items.reduce(
      (sum: number, i: any) => sum + i.shippedQuantity,
      0,
    );
    const fulfillmentRate =
      totalOrdered > 0 ? Number(((totalShipped / totalOrdered) * 100).toFixed(1)) : 0;
    const pendingQuantity = Math.max(0, totalOrdered - totalShipped);

    return {
      data: {
        ...po,
        analytics: {
          totalOrderedQuantity: totalOrdered,
          totalShippedQuantity: totalShipped,
          pendingQuantity,
          fulfillmentRate,
        },
      },
    };
  }

  async update(id: string, dto: UpdatePODTO) {
    const po = await this.prisma.pO.findUnique({
      where: { id },
    });

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    if (dto.buyerId && dto.buyerId !== po.buyerId) {
      const buyer = await this.prisma.buyer.findFirst({
        where: { id: dto.buyerId, status: { not: 'DELETED' } },
      });
      if (!buyer) throw new NotFoundException('Buyer not found');
    }

    if (dto.lcId && dto.lcId !== po.lcId) {
      const lc = await this.prisma.lC.findFirst({
        where: { id: dto.lcId, status: { notIn: ['EXPIRED', 'CANCELLED'] } },
      });
      if (!lc) throw new NotFoundException('Valid Letter of Credit (LC) not found');
    }

    if (dto.poNumber && dto.poNumber.trim().toUpperCase() !== po.poNumber) {
      const cleanPoNumber = dto.poNumber.trim().toUpperCase();
      const isExist = await this.prisma.pO.findUnique({
        where: { poNumber: cleanPoNumber },
      });
      if (isExist) {
        throw new ConflictException(`PO Number '${cleanPoNumber}' is already taken`);
      }
    }

    await this.prisma.pO.update({
      where: { id },
      data: {
        ...(dto.poNumber && { poNumber: dto.poNumber.trim().toUpperCase() }),
        ...(dto.buyerId && { buyerId: dto.buyerId }),
        ...(dto.lcId !== undefined && { lcId: dto.lcId || null }),
        ...(dto.orderDate !== undefined && {
          orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
        }),
        ...(dto.deliveryDate !== undefined && {
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
        }),
        ...(dto.status && { status: dto.status }),
        ...(dto.remarks !== undefined && { remarks: dto.remarks?.trim() ?? null }),
      },
    });

    return this.findById(id);
  }

  async addOrUpdateItems(id: string, dto: AddPOItemsDTO) {
    const po = await this.prisma.pO.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    if (po.status === 'COMPLETED' || po.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot modify line items for a PO in ${po.status} status`);
    }

    const variantIds = dto.items.map((i) => i.variantProductId);
    const validVariants = await this.prisma.variantProduct.findMany({
      where: { id: { in: variantIds }, status: { not: 'DELETED' } },
      select: { id: true },
    });

    if (validVariants.length !== variantIds.length) {
      throw new BadRequestException('One or more Variant Products not found');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const existingItem = po.items.find((i) => i.variantProductId === item.variantProductId);

        if (existingItem) {
          await tx.pOItem.update({
            where: { id: existingItem.id },
            data: { quantity: item.quantity },
          });
        } else {
          await tx.pOItem.create({
            data: {
              poId: id,
              variantProductId: item.variantProductId,
              quantity: item.quantity,
            },
          });
        }
      }

      // Recalculate total quantity
      const allItems = await tx.pOItem.findMany({ where: { poId: id } });
      const totalQuantity = allItems.reduce((sum, i) => sum + i.quantity, 0);

      await tx.pO.update({
        where: { id },
        data: { totalQuantity },
      });

      return this.findById(id, tx);
    });
  }

  async delete(id: string) {
    const po = await this.prisma.pO.findUnique({
      where: { id },
      include: {
        _count: { select: { batches: true } },
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    if (po._count.batches > 0) {
      throw new BadRequestException(
        `Cannot cancel PO '${po.poNumber}'. It has ${po._count.batches} recorded production/stock-in batch(es).`,
      );
    }

    await this.prisma.pO.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return { message: `Purchase Order '${po.poNumber}' cancelled successfully` };
  }

  async restore(id: string) {
    const po = await this.prisma.pO.findUnique({
      where: { id },
    });

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    return this.prisma.pO.update({
      where: { id },
      data: { status: 'DRAFT' },
      include: {
        buyer: { select: { id: true, name: true, code: true } },
      },
    });
  }
}
