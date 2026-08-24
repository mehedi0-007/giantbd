import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateMasterProductDTO,
  QueryMasterProductDTO,
  UpdateMasterProductDTO,
} from '../dto/master-product.dto';

@Injectable()
export class MasterProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMasterProductDTO, creatorId: string) {
    const [category, subCategory, material] = await Promise.all([
      this.prisma.category.findFirst({ where: { id: dto.categoryId, status: { not: 'DELETED' } } }),
      this.prisma.subCategory.findFirst({ where: { id: dto.subCategoryId, status: { not: 'DELETED' } } }),
      this.prisma.material.findFirst({ where: { id: dto.materialId, status: { not: 'DELETED' } } }),
    ]);

    if (!category) throw new NotFoundException('Category not found');
    if (!subCategory) throw new NotFoundException('SubCategory not found');
    if (!material) throw new NotFoundException('Material not found');

    if (subCategory.categoryId !== category.id) {
      throw new BadRequestException('SubCategory does not belong to the selected Category');
    }

    const sku = dto.sku?.trim().toUpperCase() || this.generateMasterSKU(category.name, dto.name);

    const isSkuExist = await this.prisma.masterProduct.findFirst({
      where: { sku, status: { not: 'DELETED' } },
    });

    if (isSkuExist) {
      throw new ConflictException(`Master Product with SKU '${sku}' already exists`);
    }

    return this.prisma.masterProduct.create({
      data: {
        name: dto.name.trim(),
        sku,
        description: dto.description?.trim() ?? null,
        categoryId: dto.categoryId,
        subCategoryId: dto.subCategoryId,
        materialId: dto.materialId,
        status: dto.status ?? 'ACTIVE',
        creatorId,
      },
      include: {
        category: true,
        subCategory: true,
        material: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findAll(query: QueryMasterProductDTO) {
    const per_page = Number(query.per_page) || 20;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {
      status: { not: 'DELETED' },
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.subCategoryId) where.subCategoryId = query.subCategoryId;
    if (query.materialId) where.materialId = query.materialId;
    if (query.status) where.status = query.status;

    const [total, products] = await Promise.all([
      this.prisma.masterProduct.count({ where }),
      this.prisma.masterProduct.findMany({
        where,
        skip,
        take: per_page,
        include: {
          category: { select: { id: true, name: true } },
          subCategory: { select: { id: true, name: true } },
          material: { select: { id: true, name: true } },
          _count: {
            select: { variantProducts: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: products,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async findById(id: string) {
    const product = await this.prisma.masterProduct.findFirst({
      where: { id, status: { not: 'DELETED' } },
      include: {
        category: true,
        subCategory: true,
        material: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
        variantProducts: {
          where: { status: { not: 'DELETED' } },
          include: {
            color: true,
            _count: {
              select: { batchItems: true },
            },
          },
          orderBy: [{ colorId: 'asc' }, { size: 'asc' }],
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Master Product not found');
    }

    return { data: product };
  }

  async update(id: string, dto: UpdateMasterProductDTO) {
    const product = await this.prisma.masterProduct.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!product) {
      throw new NotFoundException('Master Product not found');
    }

    if (dto.categoryId && dto.subCategoryId) {
      const subCategory = await this.prisma.subCategory.findFirst({
        where: { id: dto.subCategoryId, status: { not: 'DELETED' } },
      });
      if (!subCategory || subCategory.categoryId !== dto.categoryId) {
        throw new BadRequestException('SubCategory does not belong to the selected Category');
      }
    }

    if (dto.sku && dto.sku.trim().toUpperCase() !== product.sku) {
      const isSkuExist = await this.prisma.masterProduct.findFirst({
        where: {
          sku: dto.sku.trim().toUpperCase(),
          id: { not: id },
          status: { not: 'DELETED' },
        },
      });
      if (isSkuExist) {
        throw new ConflictException(`SKU '${dto.sku}' is already taken`);
      }
    }

    return this.prisma.masterProduct.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.sku && { sku: dto.sku.trim().toUpperCase() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.subCategoryId && { subCategoryId: dto.subCategoryId }),
        ...(dto.materialId && { materialId: dto.materialId }),
        ...(dto.status && { status: dto.status }),
      },
      include: {
        category: true,
        subCategory: true,
        material: true,
      },
    });
  }

  async delete(id: string) {
    const product = await this.prisma.masterProduct.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!product) {
      throw new NotFoundException('Master Product not found');
    }

    await this.prisma.$transaction([
      this.prisma.variantProduct.updateMany({
        where: { masterProductId: id },
        data: { status: 'DELETED' },
      }),
      this.prisma.masterProduct.update({
        where: { id },
        data: { status: 'DELETED' },
      }),
    ]);

    return { message: `Master Product '${product.name}' and variants soft-deleted successfully` };
  }

  async restore(id: string) {
    const product = await this.prisma.masterProduct.findFirst({
      where: { id, status: 'DELETED' },
    });

    if (!product) {
      throw new NotFoundException('Soft-deleted Master Product not found');
    }

    await this.prisma.$transaction([
      this.prisma.variantProduct.updateMany({
        where: { masterProductId: id, status: 'DELETED' },
        data: { status: 'ACTIVE' },
      }),
      this.prisma.masterProduct.update({
        where: { id },
        data: { status: 'ACTIVE' },
      }),
    ]);

    return { message: `Master Product '${product.name}' and variants restored successfully` };
  }

  private generateMasterSKU(categoryName: string, productName: string): string {
    const catPrefix = categoryName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'GEN');
    const prodPrefix = productName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${catPrefix}-${prodPrefix}-${rand}`;
  }
}
