import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLCDTO, QueryLCDTO, UpdateLCDTO } from './dto/lc.dto';

@Injectable()
export class LCService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLCDTO) {
    const cleanLcNumber = dto.lcNumber.trim().toUpperCase();

    const buyer = await this.prisma.buyer.findFirst({
      where: { id: dto.buyerId, status: { not: 'DELETED' } },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    const isExist = await this.prisma.lC.findUnique({
      where: { lcNumber: cleanLcNumber },
    });

    if (isExist) {
      throw new ConflictException(`Letter of Credit '${cleanLcNumber}' already exists`);
    }

    return this.prisma.lC.create({
      data: {
        lcNumber: cleanLcNumber,
        buyerId: dto.buyerId,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        shipmentDate: dto.shipmentDate ? new Date(dto.shipmentDate) : null,
        status: dto.status ?? 'OPEN',
        remarks: dto.remarks?.trim() ?? null,
      },
      include: {
        buyer: { select: { id: true, name: true, code: true, country: true } },
      },
    });
  }

  async findAll(query: QueryLCDTO) {
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

    if (query.search) {
      where.OR = [
        { lcNumber: { contains: query.search, mode: 'insensitive' } },
        { buyer: { name: { contains: query.search, mode: 'insensitive' } } },
        { buyer: { code: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.expiringInDays) {
      const days = Number(query.expiringInDays);
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      where.expiryDate = {
        gte: now,
        lte: futureDate,
      };
      where.status = { notIn: ['FULFILLED', 'EXPIRED', 'CANCELLED'] };
    }

    if (query.expiryDateFrom || query.expiryDateTo) {
      where.expiryDate = where.expiryDate || {};
      if (query.expiryDateFrom) where.expiryDate.gte = new Date(query.expiryDateFrom);
      if (query.expiryDateTo) where.expiryDate.lte = new Date(query.expiryDateTo);
    }

    if (query.shipmentDateFrom || query.shipmentDateTo) {
      where.shipmentDate = where.shipmentDate || {};
      if (query.shipmentDateFrom) where.shipmentDate.gte = new Date(query.shipmentDateFrom);
      if (query.shipmentDateTo) where.shipmentDate.lte = new Date(query.shipmentDateTo);
    }

    const [total, lcs] = await Promise.all([
      this.prisma.lC.count({ where }),
      this.prisma.lC.findMany({
        where,
        skip,
        take: per_page,
        include: {
          buyer: { select: { id: true, name: true, code: true, country: true } },
          _count: {
            select: { purchaseOrders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: lcs,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async findById(id: string) {
    const lc = await this.prisma.lC.findUnique({
      where: { id },
      include: {
        buyer: true,
        purchaseOrders: {
          include: {
            _count: { select: { items: true, batches: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lc) {
      throw new NotFoundException('Letter of Credit not found');
    }

    const totalOrderedPairs = lc.purchaseOrders.reduce(
      (sum, po) => sum + po.totalQuantity,
      0,
    );

    return {
      data: {
        ...lc,
        summary: {
          totalPurchaseOrders: lc.purchaseOrders.length,
          totalOrderedPairs,
        },
      },
    };
  }

  async update(id: string, dto: UpdateLCDTO) {
    const lc = await this.prisma.lC.findUnique({
      where: { id },
    });

    if (!lc) {
      throw new NotFoundException('Letter of Credit not found');
    }

    if (dto.buyerId && dto.buyerId !== lc.buyerId) {
      const buyer = await this.prisma.buyer.findFirst({
        where: { id: dto.buyerId, status: { not: 'DELETED' } },
      });
      if (!buyer) throw new NotFoundException('Buyer not found');
    }

    if (dto.lcNumber && dto.lcNumber.trim().toUpperCase() !== lc.lcNumber) {
      const cleanLcNumber = dto.lcNumber.trim().toUpperCase();
      const isExist = await this.prisma.lC.findUnique({
        where: { lcNumber: cleanLcNumber },
      });
      if (isExist) {
        throw new ConflictException(`LC Number '${cleanLcNumber}' is already taken`);
      }
    }

    return this.prisma.lC.update({
      where: { id },
      data: {
        ...(dto.lcNumber && { lcNumber: dto.lcNumber.trim().toUpperCase() }),
        ...(dto.buyerId && { buyerId: dto.buyerId }),
        ...(dto.issueDate !== undefined && {
          issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        }),
        ...(dto.expiryDate !== undefined && {
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        }),
        ...(dto.shipmentDate !== undefined && {
          shipmentDate: dto.shipmentDate ? new Date(dto.shipmentDate) : null,
        }),
        ...(dto.status && { status: dto.status }),
        ...(dto.remarks !== undefined && { remarks: dto.remarks?.trim() ?? null }),
      },
      include: {
        buyer: { select: { id: true, name: true, code: true, country: true } },
      },
    });
  }

  async delete(id: string) {
    const lc = await this.prisma.lC.findUnique({
      where: { id },
      include: {
        _count: { select: { purchaseOrders: true } },
      },
    });

    if (!lc) {
      throw new NotFoundException('Letter of Credit not found');
    }

    if (lc._count.purchaseOrders > 0) {
      throw new BadRequestException(
        `Cannot cancel LC '${lc.lcNumber}'. It has ${lc._count.purchaseOrders} attached Purchase Order(s).`,
      );
    }

    await this.prisma.lC.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return { message: `Letter of Credit '${lc.lcNumber}' cancelled successfully` };
  }

  async restore(id: string) {
    const lc = await this.prisma.lC.findUnique({
      where: { id },
    });

    if (!lc) {
      throw new NotFoundException('Letter of Credit not found');
    }

    return this.prisma.lC.update({
      where: { id },
      data: { status: 'OPEN' },
      include: {
        buyer: { select: { id: true, name: true, code: true } },
      },
    });
  }
}
