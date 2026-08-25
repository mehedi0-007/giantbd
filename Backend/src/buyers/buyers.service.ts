import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBuyerDTO, QueryBuyerDTO, UpdateBuyerDTO } from './dto/buyer.dto';

@Injectable()
export class BuyersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBuyerDTO) {
    const cleanCode = dto.code.trim().toUpperCase();

    const isExist = await this.prisma.buyer.findUnique({
      where: { code: cleanCode },
    });

    if (isExist) {
      throw new ConflictException(`Buyer with code '${cleanCode}' already exists`);
    }

    return this.prisma.buyer.create({
      data: {
        name: dto.name.trim(),
        code: cleanCode,
        email: dto.email?.trim() ?? null,
        phone: dto.phone?.trim() ?? null,
        address: dto.address?.trim() ?? null,
        country: dto.country?.trim() ?? null,
        contactPerson: dto.contactPerson?.trim() ?? null,
      },
    });
  }

  async findAll(query: QueryBuyerDTO) {
    const per_page = Number(query.per_page) || 50;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {
      status: { not: 'DELETED' },
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.country) {
      where.country = { contains: query.country, mode: 'insensitive' };
    }

    if (query.search) {
      where.AND = [
        { status: { not: 'DELETED' } },
        {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { code: { contains: query.search, mode: 'insensitive' } },
            { contactPerson: { contains: query.search, mode: 'insensitive' } },
            { country: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [total, buyers] = await Promise.all([
      this.prisma.buyer.count({ where }),
      this.prisma.buyer.findMany({
        where,
        skip,
        take: per_page,
        include: {
          _count: {
            select: {
              lcs: true,
              purchaseOrders: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      data: buyers,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async findById(id: string) {
    const buyer = await this.prisma.buyer.findFirst({
      where: {
        id,
        status: { not: 'DELETED' },
      },
      include: {
        lcs: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        purchaseOrders: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            items: { select: { quantity: true, shippedQuantity: true } },
            _count: { select: { batches: true } },
          },
        },
        _count: {
          select: {
            lcs: { where: { status: { not: 'CANCELLED' } } },
            purchaseOrders: { where: { status: { not: 'CANCELLED' } } },
          },
        },
      },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    const totalOrderedPairs = buyer.purchaseOrders.reduce(
      (sum, po) => sum + po.totalQuantity,
      0,
    );
    const totalDeliveredPairs = buyer.purchaseOrders.reduce(
      (sum, po) => sum + po.items.reduce((iSum, i) => iSum + i.shippedQuantity, 0),
      0,
    );
    const totalPendingPairs = Math.max(0, totalOrderedPairs - totalDeliveredPairs);

    return {
      data: {
        ...buyer,
        analytics: {
          totalActivePOs: buyer._count.purchaseOrders,
          totalActiveLCs: buyer._count.lcs,
          totalOrderedPairs,
          totalDeliveredPairs,
          totalPendingPairs,
        },
      },
    };
  }

  async update(id: string, dto: UpdateBuyerDTO) {
    const buyer = await this.prisma.buyer.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    if (dto.code && dto.code.trim().toUpperCase() !== buyer.code) {
      const cleanCode = dto.code.trim().toUpperCase();
      const isExist = await this.prisma.buyer.findFirst({
        where: {
          code: cleanCode,
          id: { not: id },
          status: { not: 'DELETED' },
        },
      });
      if (isExist) {
        throw new ConflictException(`Buyer code '${cleanCode}' is already taken`);
      }
    }

    return this.prisma.buyer.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.code && { code: dto.code.trim().toUpperCase() }),
        ...(dto.email !== undefined && { email: dto.email?.trim() ?? null }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() ?? null }),
        ...(dto.address !== undefined && { address: dto.address?.trim() ?? null }),
        ...(dto.country !== undefined && { country: dto.country?.trim() ?? null }),
        ...(dto.contactPerson !== undefined && { contactPerson: dto.contactPerson?.trim() ?? null }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  async delete(id: string) {
    const buyer = await this.prisma.buyer.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    await this.prisma.buyer.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    return { message: `Buyer '${buyer.name}' soft-deleted successfully` };
  }

  async restore(id: string) {
    const buyer = await this.prisma.buyer.findFirst({
      where: { id, status: 'DELETED' },
    });

    if (!buyer) {
      throw new NotFoundException('Soft-deleted buyer not found');
    }

    return this.prisma.buyer.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }
}
