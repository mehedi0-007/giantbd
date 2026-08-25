import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePermissionDTO } from './dto/permission.dto';

export const ERP_DEFAULT_PERMISSIONS: { name: string; module: string; description: string }[] = [
  { name: 'users:create', module: 'USERS', description: 'Create new user accounts' },
  { name: 'users:read', module: 'USERS', description: 'View user accounts and profiles' },
  { name: 'users:update', module: 'USERS', description: 'Update existing user accounts' },
  { name: 'users:delete', module: 'USERS', description: 'Delete user accounts' },

  { name: 'roles:create', module: 'ROLES', description: 'Create custom roles' },
  { name: 'roles:read', module: 'ROLES', description: 'View roles and permission matrices' },
  { name: 'roles:update', module: 'ROLES', description: 'Update roles and permission mappings' },
  { name: 'roles:delete', module: 'ROLES', description: 'Delete custom roles' },

  { name: 'catalog:create', module: 'CATALOG', description: 'Create master products, variants, categories, colors, materials' },
  { name: 'catalog:read', module: 'CATALOG', description: 'View products and catalog items' },
  { name: 'catalog:update', module: 'CATALOG', description: 'Update product information and variants' },
  { name: 'catalog:delete', module: 'CATALOG', description: 'Delete product catalog items' },

  { name: 'warehouse:create', module: 'WAREHOUSE', description: 'Create warehouses, zones, sub-zones, and racks' },
  { name: 'warehouse:read', module: 'WAREHOUSE', description: 'View warehouse layouts and locations' },
  { name: 'warehouse:update', module: 'WAREHOUSE', description: 'Update warehouse structures and rack configurations' },
  { name: 'warehouse:delete', module: 'WAREHOUSE', description: 'Delete warehouse components' },

  { name: 'inventory:read', module: 'INVENTORY', description: 'View stock levels and batch items' },
  { name: 'inventory:receive', module: 'INVENTORY', description: 'Receive new batches and stock in items to racks' },
  { name: 'inventory:transfer', module: 'INVENTORY', description: 'Transfer stock between racks/zones/warehouses' },
  { name: 'inventory:adjust', module: 'INVENTORY', description: 'Perform stock adjustments and audit counts' },

  { name: 'reports:stock', module: 'REPORTS', description: 'View and export stock inventory reports' },
  { name: 'reports:movement', module: 'REPORTS', description: 'View stock movement history and audit logs' },
];

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePermissionDTO) {
    const isExist = await this.prisma.permission.findUnique({
      where: { name: dto.name },
    });

    if (isExist) {
      throw new ConflictException(`Permission '${dto.name}' already exists`);
    }

    return this.prisma.permission.create({
      data: {
        name: dto.name,
        module: dto.module.toUpperCase(),
        description: dto.description ?? null,
      },
    });
  }

  async findAll(groupByModule = false) {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });

    if (!groupByModule) {
      return { data: permissions };
    }

    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return { data: grouped };
  }

  async seedDefaultPermissions() {
    let createdCount = 0;
    let existingCount = 0;

    for (const perm of ERP_DEFAULT_PERMISSIONS) {
      const isExist = await this.prisma.permission.findUnique({
        where: { name: perm.name },
      });

      if (!isExist) {
        await this.prisma.permission.create({
          data: {
            name: perm.name,
            module: perm.module,
            description: perm.description,
          },
        });
        createdCount++;
      } else {
        existingCount++;
      }
    }

    return {
      message: 'Default permissions synchronized',
      created: createdCount,
      existing: existingCount,
      total: ERP_DEFAULT_PERMISSIONS.length,
    };
  }
}
