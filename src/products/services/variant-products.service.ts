import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BulkCreateVariantDTO,
  CreateVariantProductDTO,
  QueryVariantProductDTO,
  UpdateVariantProductDTO,
} from '../dto/variant-product.dto';

@Injectable()
export class VariantProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVariantProductDTO, creatorId: string) {
    const [masterProduct, color] = await Promise.all([
      this.prisma.masterProduct.findFirst({
        where: { id: dto.masterProductId, status: { not: 'DELETED' } },
        include: { category: true, subCategory: true },
      }),
      this.prisma.color.findFirst({ where: { id: dto.colorId, status: { not: 'DELETED' } } }),
    ]);

    if (!masterProduct) throw new NotFoundException('Master Product not found');
    if (!color) throw new NotFoundException('Color not found');

    const cleanSize = dto.size.trim().toUpperCase();
    const name =
      dto.name?.trim() || `${masterProduct.name} - ${color.name} / ${cleanSize}`;

    const sku =
      dto.sku?.trim().toUpperCase() ||
      `${masterProduct.sku}-${color.name.toUpperCase().replace(/\s+/g, '')}-${cleanSize}`;

    const barcode = dto.barcode?.trim() || this.generateBarcode();

    const [existingSku, existingBarcode] = await Promise.all([
      this.prisma.variantProduct.findFirst({ where: { sku, status: { not: 'DELETED' } } }),
      this.prisma.variantProduct.findFirst({ where: { barcode, status: { not: 'DELETED' } } }),
    ]);

    if (existingSku) {
      throw new ConflictException(`Variant with SKU '${sku}' already exists`);
    }
    if (existingBarcode) {
      throw new ConflictException(`Variant with barcode '${barcode}' already exists`);
    }

    return this.prisma.variantProduct.create({
      data: {
        name,
        sku,
        barcode,
        size: cleanSize,
        colorId: dto.colorId,
        gender: dto.gender,
        uom: dto.uom,
        itemsPerPacket: dto.itemsPerPacket,
        packingType: dto.packingType ?? 'POLY_BAG',
        costPrice: dto.costPrice ?? 0,
        sellingPrice: dto.sellingPrice ?? 0,
        mrp: dto.mrp ?? 0,
        status: dto.status ?? 'ACTIVE',
        masterProductId: masterProduct.id,
        categoryId: masterProduct.categoryId,
        subCategoryId: masterProduct.subCategoryId,
        creatorId,
      },
      include: {
        color: true,
        masterProduct: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: { select: { id: true, name: true } },
            subCategory: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async bulkCreate(dto: BulkCreateVariantDTO, creatorId: string) {
    const masterProduct = await this.prisma.masterProduct.findFirst({
      where: { id: dto.masterProductId, status: { not: 'DELETED' } },
      include: { category: true, subCategory: true },
    });

    if (!masterProduct) {
      throw new NotFoundException('Master Product not found');
    }

    const colors = await this.prisma.color.findMany({
      where: { id: { in: dto.colorIds }, status: { not: 'DELETED' } },
    });

    if (colors.length !== dto.colorIds.length) {
      throw new BadRequestException('One or more color IDs are invalid');
    }

    const colorMap = new Map(colors.map((c) => [c.id, c.name]));
    const candidates = [];

    for (const colorId of dto.colorIds) {
      const colorName = colorMap.get(colorId)!;
      for (const size of dto.sizes) {
        const cleanSize = size.trim().toUpperCase();
        const sku = `${masterProduct.sku}-${colorName.toUpperCase().replace(/\s+/g, '')}-${cleanSize}`;
        const name = `${masterProduct.name} - ${colorName} / ${cleanSize}`;
        const barcode = this.generateBarcode();

        candidates.push({
          name,
          sku,
          barcode,
          size: cleanSize,
          colorId,
          gender: dto.gender,
          uom: dto.uom,
          itemsPerPacket: dto.itemsPerPacket,
          packingType: dto.packingType ?? 'POLY_BAG',
          costPrice: dto.costPrice ?? 0,
          sellingPrice: dto.sellingPrice ?? 0,
          mrp: dto.mrp ?? 0,
          status: 'ACTIVE' as const,
          masterProductId: masterProduct.id,
          categoryId: masterProduct.categoryId,
          subCategoryId: masterProduct.subCategoryId,
          creatorId,
        });
      }
    }

    // 1. Single query to check for existing SKUs
    const existingVariants = await this.prisma.variantProduct.findMany({
      where: {
        sku: { in: candidates.map((c) => c.sku) },
        status: { not: 'DELETED' },
      },
      select: { sku: true },
    });

    const existingSkuSet = new Set(existingVariants.map((v) => v.sku));
    const newVariants = candidates.filter((c) => !existingSkuSet.has(c.sku));

    if (newVariants.length === 0) {
      return {
        message: 'No new variants created (all requested variants already exist)',
        count: 0,
        variants: [],
      };
    }

    // 2. Single SQL Batch Insert statement returning all created rows
    const createdVariants = await this.prisma.variantProduct.createManyAndReturn({
      data: newVariants,
    });

    return {
      message: `Successfully generated ${createdVariants.length} variant products`,
      count: createdVariants.length,
      variants: createdVariants,
    };
  }

  async findAll(query: QueryVariantProductDTO) {
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
        { barcode: { contains: query.search, mode: 'insensitive' } },
        { size: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.masterProductId) where.masterProductId = query.masterProductId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.subCategoryId) where.subCategoryId = query.subCategoryId;
    if (query.colorId) where.colorId = query.colorId;
    if (query.gender) where.gender = query.gender;
    if (query.size) where.size = query.size.trim().toUpperCase();
    if (query.status) where.status = query.status;

    const [total, variants] = await Promise.all([
      this.prisma.variantProduct.count({ where }),
      this.prisma.variantProduct.findMany({
        where,
        skip,
        take: per_page,
        include: {
          color: { select: { id: true, name: true, code: true } },
          masterProduct: {
            select: {
              id: true,
              name: true,
              sku: true,
              category: { select: { id: true, name: true } },
              subCategory: { select: { id: true, name: true } },
              material: { select: { id: true, name: true } },
            },
          },
          batchItems: {
            select: {
              availableQty: true,
              location: {
                select: {
                  code: true,
                  name: true,
                  warehouse: { select: { name: true } },
                  rack: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: [{ masterProductId: 'asc' }, { colorId: 'asc' }, { size: 'asc' }],
      }),
    ]);

    const formatted = variants.map((v) => {
      const totalAvailableStock = v.batchItems.reduce(
        (sum, b) => sum + b.availableQty,
        0,
      );
      return {
        ...v,
        totalAvailableStock,
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
    const variant = await this.prisma.variantProduct.findFirst({
      where: { id, status: { not: 'DELETED' } },
      include: {
        color: true,
        masterProduct: {
          include: {
            category: true,
            subCategory: true,
            material: true,
            creator: { select: { id: true, name: true, email: true } },
          },
        },
        batchItems: {
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
    });

    if (!variant) {
      throw new NotFoundException('Variant Product not found');
    }

    const totalAvailableStock = variant.batchItems.reduce(
      (sum, b) => sum + b.availableQty,
      0,
    );

    return {
      data: {
        ...variant,
        totalAvailableStock,
      },
    };
  }

  async update(id: string, dto: UpdateVariantProductDTO) {
    const variant = await this.prisma.variantProduct.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!variant) {
      throw new NotFoundException('Variant Product not found');
    }

    if (dto.sku && dto.sku.trim().toUpperCase() !== variant.sku) {
      const isSkuExist = await this.prisma.variantProduct.findFirst({
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

    if (dto.barcode && dto.barcode.trim() !== variant.barcode) {
      const isBarcodeExist = await this.prisma.variantProduct.findFirst({
        where: {
          barcode: dto.barcode.trim(),
          id: { not: id },
          status: { not: 'DELETED' },
        },
      });
      if (isBarcodeExist) {
        throw new ConflictException(`Barcode '${dto.barcode}' is already taken`);
      }
    }

    return this.prisma.variantProduct.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.sku && { sku: dto.sku.trim().toUpperCase() }),
        ...(dto.barcode && { barcode: dto.barcode.trim() }),
        ...(dto.size && { size: dto.size.trim().toUpperCase() }),
        ...(dto.colorId && { colorId: dto.colorId }),
        ...(dto.gender && { gender: dto.gender }),
        ...(dto.uom && { uom: dto.uom }),
        ...(dto.itemsPerPacket && { itemsPerPacket: dto.itemsPerPacket }),
        ...(dto.packingType && { packingType: dto.packingType }),
        ...(dto.costPrice !== undefined && { costPrice: dto.costPrice }),
        ...(dto.sellingPrice !== undefined && { sellingPrice: dto.sellingPrice }),
        ...(dto.mrp !== undefined && { mrp: dto.mrp }),
        ...(dto.status && { status: dto.status }),
      },
      include: {
        color: true,
        masterProduct: { select: { id: true, name: true, sku: true } },
      },
    });
  }

  async delete(id: string) {
    const variant = await this.prisma.variantProduct.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!variant) {
      throw new NotFoundException('Variant Product not found');
    }

    await this.prisma.variantProduct.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    return { message: `Variant Product '${variant.sku}' soft-deleted successfully` };
  }

  async updatePicture(id: string, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file uploaded');
    }

    const variant = await this.prisma.variantProduct.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!variant) {
      throw new NotFoundException('Variant Product not found');
    }

    const normalizedPath = file.path.replace(/\\/g, '/');

    return this.prisma.variantProduct.update({
      where: { id },
      data: {
        picture: normalizedPath,
      },
    });
  }

  async restore(id: string) {
    const variant = await this.prisma.variantProduct.findFirst({
      where: { id, status: 'DELETED' },
    });

    if (!variant) {
      throw new NotFoundException('Soft-deleted Variant Product not found');
    }

    return this.prisma.variantProduct.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  private generateBarcode(): string {
    const prefix = 'PROD';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(10000 + Math.random() * 90000).toString();
    const raw = `${prefix}${timestamp}${random}`;
    return raw.slice(0, 13);
  }
}
