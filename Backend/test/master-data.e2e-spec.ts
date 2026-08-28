import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';
import { TransformResponseInterceptor } from './../src/common/interceptors/transform-response.interceptor';
import { GlobalExceptionFilter } from './../src/common/filters/global-exception.filter';

describe('MasterData API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let testUserId: string;
  let testRoleId: string;
  let shouldDeleteRole = false;

  const testIds = {
    categoryId: '',
    subCategoryId: '',
    colorId: '',
    materialId: '',
    warehouseId: '',
    zoneId: '',
    subZoneId: '',
    rackId: '',
    masterProductId: '',
    variantProductId: '',
  };

  const ts = Date.now().toString().slice(-6);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());
    
    await app.init();
    prisma = app.get(PrismaService);

    // Use exactly 'SUPER_ADMIN' to bypass PermissionsGuard
    let role = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    if (!role) {
      role = await prisma.role.create({
        data: { name: 'SUPER_ADMIN' },
      });
      shouldDeleteRole = true;
    }
    testRoleId = role.id;

    // Create test user
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const createdUser = await prisma.user.create({
      data: {
        name: 'Master Data Test Admin',
        email: `admin_${ts}@example.com`,
        password: hashedPassword,
        gender: 'MALE' as any,
        phone: `999${ts}`,
        roleId: testRoleId,
      },
    });
    testUserId = createdUser.id;

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: `admin_${ts}@example.com`, password: 'password123' });
    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    // Fallback cleanup in case DELETE endpoints failed
    if (testIds.variantProductId) await prisma.variantProduct.deleteMany({ where: { id: testIds.variantProductId }});
    if (testIds.masterProductId) await prisma.masterProduct.deleteMany({ where: { id: testIds.masterProductId }});
    
    if (testIds.rackId) await prisma.storageLocation.deleteMany({ where: { rackId: testIds.rackId }});
    if (testIds.rackId) await prisma.rack.deleteMany({ where: { id: testIds.rackId }});
    if (testIds.subZoneId) await prisma.subZone.deleteMany({ where: { id: testIds.subZoneId }});
    if (testIds.zoneId) await prisma.zone.deleteMany({ where: { id: testIds.zoneId }});
    if (testIds.warehouseId) await prisma.warehouse.deleteMany({ where: { id: testIds.warehouseId }});
    
    if (testIds.subCategoryId) await prisma.subCategory.deleteMany({ where: { id: testIds.subCategoryId }});
    if (testIds.categoryId) await prisma.category.deleteMany({ where: { id: testIds.categoryId }});
    if (testIds.colorId) await prisma.color.deleteMany({ where: { id: testIds.colorId }});
    if (testIds.materialId) await prisma.material.deleteMany({ where: { id: testIds.materialId }});
    
    if (testUserId) await prisma.user.deleteMany({ where: { id: testUserId } });
    if (shouldDeleteRole && testRoleId) await prisma.role.deleteMany({ where: { id: testRoleId } });
    
    await app.close();
  });

  describe('1. Creation (POST)', () => {
    it('creates a category', async () => {
      const res = await request(app.getHttpServer()).post('/api/attributes/categories').set('Authorization', `Bearer ${accessToken}`).send({ name: `Cat_${ts}` }).expect(201);
      testIds.categoryId = res.body.data.id;
    });

    it('creates a subcategory', async () => {
      const res = await request(app.getHttpServer()).post('/api/attributes/subcategories').set('Authorization', `Bearer ${accessToken}`).send({ name: `SubCat_${ts}`, categoryId: testIds.categoryId }).expect(201);
      testIds.subCategoryId = res.body.data.id;
    });

    it('creates a color', async () => {
      const res = await request(app.getHttpServer()).post('/api/attributes/colors').set('Authorization', `Bearer ${accessToken}`).send({ name: `Color_${ts}`, code: '#FFF' }).expect(201);
      testIds.colorId = res.body.data.id;
    });

    it('creates a material', async () => {
      const res = await request(app.getHttpServer()).post('/api/attributes/materials').set('Authorization', `Bearer ${accessToken}`).send({ name: `Material_${ts}` }).expect(201);
      testIds.materialId = res.body.data.id;
    });

    it('creates a warehouse', async () => {
      const res = await request(app.getHttpServer()).post('/api/attributes/warehouses').set('Authorization', `Bearer ${accessToken}`).send({ name: `WH_${ts}`, code: `W${ts}` }).expect(201);
      testIds.warehouseId = res.body.data.id;
    });

    it('creates a zone', async () => {
      const res = await request(app.getHttpServer()).post('/api/attributes/zones').set('Authorization', `Bearer ${accessToken}`).send({ name: `Zone_${ts}`, code: `Z${ts}`, warehouseId: testIds.warehouseId }).expect(201);
      testIds.zoneId = res.body.data.id;
    });

    it('creates a subzone', async () => {
      const res = await request(app.getHttpServer()).post('/api/attributes/subzones').set('Authorization', `Bearer ${accessToken}`).send({ name: `SubZone_${ts}`, code: `SZ${ts}`, zoneId: testIds.zoneId }).expect(201);
      testIds.subZoneId = res.body.data.id;
    });

    it('creates a rack', async () => {
      const res = await request(app.getHttpServer()).post('/api/attributes/racks').set('Authorization', `Bearer ${accessToken}`).send({ name: `Rack_${ts}`, code: `R${ts}`, subZoneId: testIds.subZoneId }).expect(201);
      testIds.rackId = res.body.data.id;
    });

    it('creates a master product', async () => {
      const res = await request(app.getHttpServer()).post('/api/master-products').set('Authorization', `Bearer ${accessToken}`).send({
        name: `MP_${ts}`, sku: `SKU_MP_${ts}`, categoryId: testIds.categoryId, subCategoryId: testIds.subCategoryId, materialId: testIds.materialId,
      }).expect(201);
      testIds.masterProductId = res.body.data.id;
    });

    it('creates a variant product', async () => {
      const res = await request(app.getHttpServer()).post('/api/variants').set('Authorization', `Bearer ${accessToken}`).send({
        name: `VP_${ts}`, sku: `SKU_VP_${ts}`, barcode: `BC_${ts}`, size: 'XL', colorId: testIds.colorId, gender: 'MALE', uom: 'PAIR', itemsPerPacket: 10, masterProductId: testIds.masterProductId,
      }).expect(201);
      testIds.variantProductId = res.body.data.id;
    });
  });

  describe('2. Fetching (GET)', () => {
    it('fetches all categories', async () => {
      const res = await request(app.getHttpServer()).get('/api/attributes/categories').set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    it('fetches all subcategories', async () => {
      const res = await request(app.getHttpServer()).get('/api/attributes/subcategories').set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    it('fetches all colors', async () => {
      const res = await request(app.getHttpServer()).get('/api/attributes/colors').set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    it('fetches all materials', async () => {
      const res = await request(app.getHttpServer()).get('/api/attributes/materials').set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    it('fetches all warehouses', async () => {
      const res = await request(app.getHttpServer()).get('/api/attributes/warehouses').set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    it('fetches all zones', async () => {
      const res = await request(app.getHttpServer()).get('/api/attributes/zones').set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    it('fetches all subzones', async () => {
      const res = await request(app.getHttpServer()).get('/api/attributes/subzones').set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    it('fetches all racks', async () => {
      const res = await request(app.getHttpServer()).get('/api/attributes/racks').set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    it('fetches the category by ID', async () => {
      const res = await request(app.getHttpServer()).get(`/api/attributes/categories/${testIds.categoryId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(res.body.data.id).toBe(testIds.categoryId);
    });

    it('fetches the subcategory by ID', async () => {
      const res = await request(app.getHttpServer()).get(`/api/attributes/subcategories/${testIds.subCategoryId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(res.body.data.id).toBe(testIds.subCategoryId);
    });

    it('fetches the color by ID', async () => {
      const res = await request(app.getHttpServer()).get(`/api/attributes/colors/${testIds.colorId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(res.body.data.id).toBe(testIds.colorId);
    });

    it('fetches the material by ID', async () => {
      const res = await request(app.getHttpServer()).get(`/api/attributes/materials/${testIds.materialId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(res.body.data.id).toBe(testIds.materialId);
    });

    it('fetches the variant product by ID', async () => {
      const res = await request(app.getHttpServer()).get(`/api/variants/${testIds.variantProductId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(res.body.data.id).toBe(testIds.variantProductId);
    });

    it('fetches the master product by ID', async () => {
      const res = await request(app.getHttpServer()).get(`/api/master-products/${testIds.masterProductId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(res.body.data.id).toBe(testIds.masterProductId);
    });
    
    it('fetches the warehouse by ID', async () => {
      const res = await request(app.getHttpServer()).get(`/api/attributes/warehouses/${testIds.warehouseId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(res.body.data.id).toBe(testIds.warehouseId);
    });

    it('fetches the zone by ID', async () => {
      const res = await request(app.getHttpServer()).get(`/api/attributes/zones/${testIds.zoneId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(res.body.data.id).toBe(testIds.zoneId);
    });

    it('fetches the subzone by ID', async () => {
      const res = await request(app.getHttpServer()).get(`/api/attributes/subzones/${testIds.subZoneId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(res.body.data.id).toBe(testIds.subZoneId);
    });

    it('fetches the rack by ID', async () => {
      const res = await request(app.getHttpServer()).get(`/api/attributes/racks/${testIds.rackId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(res.body.data.id).toBe(testIds.rackId);
    });
  });

  describe('3. Updates (PATCH)', () => {
    it('updates the variant product', async () => {
      const res = await request(app.getHttpServer()).patch(`/api/variants/${testIds.variantProductId}`).set('Authorization', `Bearer ${accessToken}`)
        .send({ name: `VP_${ts}_Updated` }).expect(200);
      expect(res.body.data.name).toBe(`VP_${ts}_Updated`);
    });

    it('updates the category', async () => {
      const res = await request(app.getHttpServer()).patch(`/api/attributes/categories/${testIds.categoryId}`).set('Authorization', `Bearer ${accessToken}`)
        .send({ name: `Cat_${ts}_Updated` }).expect(200);
      expect(res.body.data.name).toBe(`Cat_${ts}_Updated`);
    });

    it('updates the subcategory', async () => {
      const res = await request(app.getHttpServer()).patch(`/api/attributes/subcategories/${testIds.subCategoryId}`).set('Authorization', `Bearer ${accessToken}`)
        .send({ name: `SubCat_${ts}_Updated` }).expect(200);
      expect(res.body.data.name).toBe(`SubCat_${ts}_Updated`);
    });

    it('updates the color', async () => {
      const res = await request(app.getHttpServer()).patch(`/api/attributes/colors/${testIds.colorId}`).set('Authorization', `Bearer ${accessToken}`)
        .send({ name: `Color_${ts}_Updated` }).expect(200);
      expect(res.body.data.name).toBe(`Color_${ts}_Updated`);
    });

    it('updates the material', async () => {
      const res = await request(app.getHttpServer()).patch(`/api/attributes/materials/${testIds.materialId}`).set('Authorization', `Bearer ${accessToken}`)
        .send({ name: `Mat_${ts}_Updated` }).expect(200);
      expect(res.body.data.name).toBe(`Mat_${ts}_Updated`);
    });

    it('updates the warehouse', async () => {
      const res = await request(app.getHttpServer()).patch(`/api/attributes/warehouses/${testIds.warehouseId}`).set('Authorization', `Bearer ${accessToken}`)
        .send({ name: `WH_${ts}_Updated` }).expect(200);
      expect(res.body.data.name).toBe(`WH_${ts}_Updated`);
    });

    it('updates the zone', async () => {
      const res = await request(app.getHttpServer()).patch(`/api/attributes/zones/${testIds.zoneId}`).set('Authorization', `Bearer ${accessToken}`)
        .send({ name: `Zone_${ts}_Updated` }).expect(200);
      expect(res.body.data.name).toBe(`Zone_${ts}_Updated`);
    });

    it('updates the subzone', async () => {
      const res = await request(app.getHttpServer()).patch(`/api/attributes/subzones/${testIds.subZoneId}`).set('Authorization', `Bearer ${accessToken}`)
        .send({ name: `SubZone_${ts}_Updated` }).expect(200);
      expect(res.body.data.name).toBe(`SubZone_${ts}_Updated`);
    });

    it('updates the rack', async () => {
      const res = await request(app.getHttpServer()).patch(`/api/attributes/racks/${testIds.rackId}`).set('Authorization', `Bearer ${accessToken}`)
        .send({ name: `Rack_${ts}_Updated` }).expect(200);
      expect(res.body.data.name).toBe(`Rack_${ts}_Updated`);
    });
  });

  describe('4. Storage Locations (GET)', () => {
    it('fetches all storage locations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attributes/locations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    it('fetches location by ID', async () => {
      // Create a storage location first
      const loc = await prisma.storageLocation.create({
        data: { name: `Loc_${ts}`, code: `L_${ts}`, warehouseId: testIds.warehouseId, zoneId: testIds.zoneId, subZoneId: testIds.subZoneId, rackId: testIds.rackId }
      });

      const res = await request(app.getHttpServer())
        .get(`/api/attributes/locations/${loc.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.data.id).toBe(loc.id);

      // Cleanup
      await prisma.storageLocation.delete({ where: { id: loc.id } });
    });

    it('fetches location by barcode', async () => {
      const barcode = `BC_${ts}`;
      const loc = await prisma.storageLocation.create({
        data: { name: `LocBC_${ts}`, code: barcode, warehouseId: testIds.warehouseId, zoneId: testIds.zoneId, subZoneId: testIds.subZoneId, rackId: testIds.rackId }
      });

      const res = await request(app.getHttpServer())
        .get(`/api/attributes/locations/barcode/${barcode}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.data.code).toBe(barcode);

      await prisma.storageLocation.delete({ where: { id: loc.id } });
    });
  });

  describe('5. Deletions (DELETE)', () => {
    // Delete in reverse order of creation dependencies
    it('deletes the variant product', async () => {
      await request(app.getHttpServer()).delete(`/api/variants/${testIds.variantProductId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
    });

    it('deletes the master product', async () => {
      await request(app.getHttpServer()).delete(`/api/master-products/${testIds.masterProductId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
    });

    it('deletes the rack', async () => {
      // Must first delete storage locations to avoid foreign key issues
      await prisma.storageLocation.deleteMany({ where: { rackId: testIds.rackId }});
      await request(app.getHttpServer()).delete(`/api/attributes/racks/${testIds.rackId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
    });

    it('deletes the subzone', async () => {
      await request(app.getHttpServer()).delete(`/api/attributes/subzones/${testIds.subZoneId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
    });

    it('deletes the zone', async () => {
      await request(app.getHttpServer()).delete(`/api/attributes/zones/${testIds.zoneId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
    });

    it('deletes the warehouse', async () => {
      await request(app.getHttpServer()).delete(`/api/attributes/warehouses/${testIds.warehouseId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
    });

    it('deletes the material', async () => {
      await request(app.getHttpServer()).delete(`/api/attributes/materials/${testIds.materialId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
    });

    it('deletes the color', async () => {
      await request(app.getHttpServer()).delete(`/api/attributes/colors/${testIds.colorId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
    });

    it('deletes the subcategory', async () => {
      await request(app.getHttpServer()).delete(`/api/attributes/subcategories/${testIds.subCategoryId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
    });

    it('deletes the category', async () => {
      await request(app.getHttpServer()).delete(`/api/attributes/categories/${testIds.categoryId}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
    });
  });
});
