import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBuyerDTO, UpdateBuyerDTO } from './dto/buyer.dto';
import { PaginationQueryDTO } from '../common';

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

  async findAll(query: PaginationQueryDTO) {
    const per_page = Number(query.per_page) || 50;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { contactPerson: { contains: query.search, mode: 'insensitive' } },
        { country: { contains: query.search, mode: 'insensitive' } },
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
    const buyer = await this.prisma.buyer.findUnique({
      where: { id },
      include: {
        lcs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            _count: { select: { items: true, batches: true } },
          },
        },
        _count: {
          select: {
            lcs: true,
            purchaseOrders: true,
          },
        },
      },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    return { data: buyer };
  }

  async update(id: string, dto: UpdateBuyerDTO) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { id },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    if (dto.code && dto.code.trim().toUpperCase() !== buyer.code) {
      const cleanCode = dto.code.trim().toUpperCase();
      const isExist = await this.prisma.buyer.findUnique({
        where: { code: cleanCode },
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
    const buyer = await this.prisma.buyer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            lcs: true,
            purchaseOrders: true,
          },
        },
      },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    if (buyer._count.lcs > 0 || buyer._count.purchaseOrders > 0) {
      throw new BadRequestException(
        `Cannot delete buyer '${buyer.name}'. It is referenced by ${buyer._count.lcs} LC(s) and ${buyer._count.purchaseOrders} Purchase Order(s).`,
      );
    }

    await this.prisma.buyer.delete({ where: { id } });

    return { message: `Buyer '${buyer.name}' deleted successfully` };
  }
}
