import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCategoryDTO,
  CreateSubCategoryDTO,
  UpdateCategoryDTO,
  UpdateSubCategoryDTO,
} from '../dto/category-attribute.dto';
import {
  CreateColorDTO,
  CreateMaterialDTO,
  UpdateColorDTO,
  UpdateMaterialDTO,
} from '../dto/product-attribute.dto';
import { PaginationQueryDTO } from '../../common';

@Injectable()
export class ProductAttributesService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(dto: CreateCategoryDTO) {
    const isExist = await this.prisma.category.findFirst({
      where: { name: dto.name.trim(), status: { not: 'DELETED' } },
    });

    if (isExist) {
      throw new ConflictException(`Category '${dto.name}' already exists`);
    }

    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
      },
      include: {
        subCategories: true,
      },
    });
  }

  async findAllCategories(query: PaginationQueryDTO) {
    const per_page = Number(query.per_page) || 50;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {
      status: { not: 'DELETED' },
    };

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [total, categories] = await Promise.all([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
        where,
        skip,
        take: per_page,
        include: {
          subCategories: {
            where: { status: 'ACTIVE' },
          },
          _count: {
            select: {
              masterProducts: true,
              variantProducts: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      data: categories,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async findCategoryById(id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, status: { not: 'DELETED' } },
      include: {
        subCategories: {
          where: { status: { not: 'DELETED' } },
        },
        _count: {
          select: {
            masterProducts: true,
            variantProducts: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return { data: category };
  }

  async updateCategory(id: string, dto: UpdateCategoryDTO) {
    const category = await this.prisma.category.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.status && { status: dto.status }),
      },
      include: {
        subCategories: true,
      },
    });
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.prisma.category.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    return { message: `Category '${category.name}' soft-deleted successfully` };
  }

  async createSubCategory(dto: CreateSubCategoryDTO) {
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, status: { not: 'DELETED' } },
    });

    if (!category) {
      throw new NotFoundException('Parent category not found');
    }

    const isExist = await this.prisma.subCategory.findFirst({
      where: {
        categoryId: dto.categoryId,
        name: dto.name.trim(),
        status: { not: 'DELETED' },
      },
    });

    if (isExist) {
      throw new ConflictException(
        `Subcategory '${dto.name}' already exists in '${category.name}'`,
      );
    }

    return this.prisma.subCategory.create({
      data: {
        name: dto.name.trim(),
        categoryId: dto.categoryId,
      },
      include: {
        category: true,
      },
    });
  }

  async findAllSubCategories(query: PaginationQueryDTO) {
    const per_page = Number(query.per_page) || 50;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {
      status: { not: 'DELETED' },
    };

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [total, subcategories] = await Promise.all([
      this.prisma.subCategory.count({ where }),
      this.prisma.subCategory.findMany({
        where,
        skip,
        take: per_page,
        include: {
          category: { select: { id: true, name: true } },
          _count: {
            select: {
              masterProducts: true,
              variantProducts: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      data: subcategories,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async findSubCategoryById(id: string) {
    const subCategory = await this.prisma.subCategory.findFirst({
      where: { id, status: { not: 'DELETED' } },
      include: {
        category: true,
        _count: {
          select: {
            masterProducts: true,
            variantProducts: true,
          },
        },
      },
    });

    if (!subCategory) {
      throw new NotFoundException('SubCategory not found');
    }

    return { data: subCategory };
  }

  async updateSubCategory(id: string, dto: UpdateSubCategoryDTO) {
    const subCategory = await this.prisma.subCategory.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!subCategory) {
      throw new NotFoundException('SubCategory not found');
    }

    return this.prisma.subCategory.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  async deleteSubCategory(id: string) {
    const subCategory = await this.prisma.subCategory.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!subCategory) {
      throw new NotFoundException('SubCategory not found');
    }

    await this.prisma.subCategory.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    return { message: `SubCategory '${subCategory.name}' soft-deleted successfully` };
  }

  async createColor(dto: CreateColorDTO) {
    const isExist = await this.prisma.color.findFirst({
      where: { name: dto.name.trim(), status: { not: 'DELETED' } },
    });

    if (isExist) {
      throw new ConflictException(`Color '${dto.name}' already exists`);
    }

    return this.prisma.color.create({
      data: {
        name: dto.name.trim(),
        code: dto.code?.trim() ?? null,
        description: dto.description?.trim() ?? null,
      },
    });
  }

  async findAllColors(query: PaginationQueryDTO) {
    const per_page = Number(query.per_page) || 100;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {
      status: { not: 'DELETED' },
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, colors] = await Promise.all([
      this.prisma.color.count({ where }),
      this.prisma.color.findMany({
        where,
        skip,
        take: per_page,
        include: {
          _count: {
            select: { variantProducts: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      data: colors,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async findColorById(id: string) {
    const color = await this.prisma.color.findFirst({
      where: { id, status: { not: 'DELETED' } },
      include: {
        _count: {
          select: { variantProducts: true },
        },
      },
    });

    if (!color) {
      throw new NotFoundException('Color not found');
    }

    return { data: color };
  }

  async updateColor(id: string, dto: UpdateColorDTO) {
    const color = await this.prisma.color.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!color) {
      throw new NotFoundException('Color not found');
    }

    return this.prisma.color.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.code !== undefined && { code: dto.code?.trim() ?? null }),
        ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  async deleteColor(id: string) {
    const color = await this.prisma.color.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!color) {
      throw new NotFoundException('Color not found');
    }

    await this.prisma.color.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    return { message: `Color '${color.name}' soft-deleted successfully` };
  }

  async createMaterial(dto: CreateMaterialDTO) {
    const isExist = await this.prisma.material.findFirst({
      where: { name: dto.name.trim(), status: { not: 'DELETED' } },
    });

    if (isExist) {
      throw new ConflictException(`Material '${dto.name}' already exists`);
    }

    return this.prisma.material.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
      },
    });
  }

  async findAllMaterials(query: PaginationQueryDTO) {
    const per_page = Number(query.per_page) || 100;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {
      status: { not: 'DELETED' },
    };

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [total, materials] = await Promise.all([
      this.prisma.material.count({ where }),
      this.prisma.material.findMany({
        where,
        skip,
        take: per_page,
        include: {
          _count: {
            select: { masterProducts: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      data: materials,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async findMaterialById(id: string) {
    const material = await this.prisma.material.findFirst({
      where: { id, status: { not: 'DELETED' } },
      include: {
        _count: {
          select: { masterProducts: true },
        },
      },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return { data: material };
  }

  async updateMaterial(id: string, dto: UpdateMaterialDTO) {
    const material = await this.prisma.material.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return this.prisma.material.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  async deleteMaterial(id: string) {
    const material = await this.prisma.material.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    await this.prisma.material.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    return { message: `Material '${material.name}' soft-deleted successfully` };
  }
}
