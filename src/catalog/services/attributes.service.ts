import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateColorDTO,
  CreateMaterialDTO,
  UpdateColorDTO,
  UpdateMaterialDTO,
} from '../dto/attribute.dto';
import { PaginationQueryDTO } from '../../common';

@Injectable()
export class AttributesService {
  constructor(private readonly prisma: PrismaService) {}

  async createColor(dto: CreateColorDTO) {
    const isExist = await this.prisma.color.findUnique({
      where: { name: dto.name.trim() },
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

    const where: any = {};
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
    const color = await this.prisma.color.findUnique({
      where: { id },
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
    const color = await this.prisma.color.findUnique({
      where: { id },
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
    const color = await this.prisma.color.findUnique({
      where: { id },
      include: {
        _count: {
          select: { variantProducts: true },
        },
      },
    });

    if (!color) {
      throw new NotFoundException('Color not found');
    }

    if (color._count.variantProducts > 0) {
      throw new BadRequestException(
        `Cannot delete color '${color.name}'. It is used in ${color._count.variantProducts} product variant(s).`,
      );
    }

    await this.prisma.color.delete({ where: { id } });

    return { message: `Color '${color.name}' deleted successfully` };
  }

  async createMaterial(dto: CreateMaterialDTO) {
    const isExist = await this.prisma.material.findUnique({
      where: { name: dto.name.trim() },
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

    const where: any = {};
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
    const material = await this.prisma.material.findUnique({
      where: { id },
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
    const material = await this.prisma.material.findUnique({
      where: { id },
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
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: {
        _count: {
          select: { masterProducts: true },
        },
      },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    if (material._count.masterProducts > 0) {
      throw new BadRequestException(
        `Cannot delete material '${material.name}'. It is used in ${material._count.masterProducts} master product(s).`,
      );
    }

    await this.prisma.material.delete({ where: { id } });

    return { message: `Material '${material.name}' deleted successfully` };
  }
}
