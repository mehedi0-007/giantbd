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
} from '../dto/category.dto';
import { PaginationQueryDTO } from '../../common';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(dto: CreateCategoryDTO) {
    const isExist = await this.prisma.category.findUnique({
      where: { name: dto.name.trim() },
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

    const where: any = {};
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
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: true,
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
    const category = await this.prisma.category.findUnique({
      where: { id },
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
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            masterProducts: true,
            variantProducts: true,
            subCategories: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category._count.masterProducts > 0 || category._count.variantProducts > 0) {
      throw new BadRequestException(
        `Cannot delete category '${category.name}'. It is referenced by existing products.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });

    return { message: `Category '${category.name}' deleted successfully` };
  }

  async createSubCategory(dto: CreateSubCategoryDTO) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Parent category not found');
    }

    const isExist = await this.prisma.subCategory.findUnique({
      where: {
        categoryId_name: {
          categoryId: dto.categoryId,
          name: dto.name.trim(),
        },
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

  async findSubCategoriesByCategory(categoryId: string) {
    const subCategories = await this.prisma.subCategory.findMany({
      where: { categoryId },
      include: {
        _count: {
          select: {
            masterProducts: true,
            variantProducts: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return { data: subCategories };
  }

  async updateSubCategory(id: string, dto: UpdateSubCategoryDTO) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { id },
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
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { id },
      include: {
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

    if (subCategory._count.masterProducts > 0 || subCategory._count.variantProducts > 0) {
      throw new BadRequestException(
        `Cannot delete subcategory '${subCategory.name}'. It is referenced by existing products.`,
      );
    }

    await this.prisma.subCategory.delete({ where: { id } });

    return { message: `SubCategory '${subCategory.name}' deleted successfully` };
  }
}
