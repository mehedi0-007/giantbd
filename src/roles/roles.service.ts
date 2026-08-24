import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDTO, UpdateRoleDTO } from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoleDTO) {
    const normalizedName = dto.name.trim().toUpperCase();

    const isExist = await this.prisma.role.findUnique({
      where: { name: normalizedName },
    });

    if (isExist) {
      throw new ConflictException(`Role with name '${normalizedName}' already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: normalizedName,
          description: dto.description ?? null,
        },
      });

      if (dto.permissionIds && dto.permissionIds.length > 0) {
        const validPermissions = await tx.permission.findMany({
          where: { id: { in: dto.permissionIds } },
          select: { id: true },
        });

        if (validPermissions.length > 0) {
          await tx.rolePermission.createMany({
            data: validPermissions.map((p) => ({
              roleId: role.id,
              permissionId: p.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      return this.findById(role.id, tx);
    });
  }

  async findAll(query: { page?: number; per_page?: number; search?: string }) {
    const per_page = Number(query.per_page) || 20;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * per_page;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, roles] = await Promise.all([
      this.prisma.role.count({ where }),
      this.prisma.role.findMany({
        where,
        skip,
        take: per_page,
        include: {
          _count: {
            select: {
              users: true,
              rolePermissions: true,
            },
          },
          rolePermissions: {
            include: {
              permission: {
                select: {
                  id: true,
                  name: true,
                  module: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const formattedRoles = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      status: role.status,
      userCount: role._count.users,
      permissionCount: role._count.rolePermissions,
      permissions: role.rolePermissions.map((rp) => rp.permission),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));

    return {
      data: formattedRoles,
      total,
      per_page,
      current_page: page,
      total_page: Math.ceil(total / per_page),
    };
  }

  async findById(id: string, prismaClient: any = this.prisma) {
    const role = await prismaClient.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      data: {
        id: role.id,
        name: role.name,
        description: role.description,
        status: role.status,
        userCount: role._count.users,
        permissions: role.rolePermissions.map((rp: any) => rp.permission),
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    };
  }

  async update(id: string, dto: UpdateRoleDTO) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.name === 'SUPER_ADMIN' && dto.name && dto.name.toUpperCase() !== 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot rename the system SUPER_ADMIN role');
    }

    return this.prisma.$transaction(async (tx) => {
      const dataToUpdate: any = {};
      if (dto.name) {
        dataToUpdate.name = dto.name.trim().toUpperCase();
      }
      if (dto.description !== undefined) {
        dataToUpdate.description = dto.description;
      }
      if (dto.status !== undefined) {
        dataToUpdate.status = dto.status;
      }

      if (Object.keys(dataToUpdate).length > 0) {
        await tx.role.update({
          where: { id },
          data: dataToUpdate,
        });
      }

      if (dto.permissionIds !== undefined) {
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });

        if (dto.permissionIds.length > 0) {
          const validPermissions = await tx.permission.findMany({
            where: { id: { in: dto.permissionIds } },
            select: { id: true },
          });

          if (validPermissions.length > 0) {
            await tx.rolePermission.createMany({
              data: validPermissions.map((p) => ({
                roleId: id,
                permissionId: p.id,
              })),
            });
          }
        }
      }

      return this.findById(id, tx);
    });
  }

  async delete(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.name === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot delete the root SUPER_ADMIN role');
    }

    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}'. It is currently assigned to ${role._count.users} active user(s). Reassign them first.`,
      );
    }

    await this.prisma.role.delete({
      where: { id },
    });

    return {
      message: `Role '${role.name}' deleted successfully`,
    };
  }
}
