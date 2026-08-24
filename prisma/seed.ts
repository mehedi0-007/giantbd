import 'dotenv/config';
import { PrismaClient, Gender, Status } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PERMISSIONS = [
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

const ROLES = [
  {
    name: 'SUPER_ADMIN',
    description: 'Full unrestricted system access across all ERP modules',
    permissions: PERMISSIONS.map((p) => p.name),
  },
  {
    name: 'ADMIN',
    description: 'System administrator with user, catalog, warehouse and inventory controls',
    permissions: [
      'users:create', 'users:read', 'users:update',
      'roles:read',
      'catalog:create', 'catalog:read', 'catalog:update', 'catalog:delete',
      'warehouse:create', 'warehouse:read', 'warehouse:update',
      'inventory:read', 'inventory:receive', 'inventory:transfer', 'inventory:adjust',
      'reports:stock', 'reports:movement',
    ],
  },
  {
    name: 'WAREHOUSE_MANAGER',
    description: 'Manages warehouse layouts, racks, stock movements, and batch receiving',
    permissions: [
      'catalog:read',
      'warehouse:create', 'warehouse:read', 'warehouse:update',
      'inventory:read', 'inventory:receive', 'inventory:transfer', 'inventory:adjust',
      'reports:stock', 'reports:movement',
    ],
  },
  {
    name: 'INVENTORY_OFFICER',
    description: 'Performs batch receiving, transfers, and inventory adjustments',
    permissions: [
      'catalog:read',
      'warehouse:read',
      'inventory:read', 'inventory:receive', 'inventory:transfer', 'inventory:adjust',
      'reports:stock',
    ],
  },
  {
    name: 'OPERATOR',
    description: 'Floor operator for stock viewing and receiving',
    permissions: [
      'catalog:read',
      'warehouse:read',
      'inventory:read', 'inventory:receive',
    ],
  },
];

async function main() {
  console.log('🌱 Seeding ERP database...');

  console.log('  → Seeding permissions...');
  const permissionMap = new Map<string, string>();

  for (const perm of PERMISSIONS) {
    const p = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { module: perm.module, description: perm.description },
      create: {
        name: perm.name,
        module: perm.module,
        description: perm.description,
      },
    });
    permissionMap.set(p.name, p.id);
  }
  console.log(`    ✓ ${PERMISSIONS.length} permissions ready.`);

  console.log('  → Seeding roles & permissions mapping...');
  const roleMap = new Map<string, string>();

  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        status: Status.ACTIVE,
      },
    });
    roleMap.set(role.name, role.id);

    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    const rolePermsData = roleDef.permissions
      .filter((permName) => permissionMap.has(permName))
      .map((permName) => ({
        roleId: role.id,
        permissionId: permissionMap.get(permName)!,
      }));

    if (rolePermsData.length > 0) {
      await prisma.rolePermission.createMany({
        data: rolePermsData,
        skipDuplicates: true,
      });
    }
  }
  console.log(`    ✓ ${ROLES.length} roles configured with permissions.`);

  console.log('  → Seeding Super Admin user...');
  const superAdminRoleId = roleMap.get('SUPER_ADMIN');

  if (superAdminRoleId) {
    const adminEmail = 'admin@mail.com';
    const hashedPassword = await bcrypt.hash('password', 10);

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        roleId: superAdminRoleId,
        status: Status.ACTIVE,
      },
      create: {
        name: 'System Administrator',
        email: adminEmail,
        password: hashedPassword,
        phone: '01700000000',
        gender: Gender.MALE,
        roleId: superAdminRoleId,
        status: Status.ACTIVE,
      },
    });

    console.log(`    ✓ Super Admin created: ${admin.email} (Password: Admin@123456)`);
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
