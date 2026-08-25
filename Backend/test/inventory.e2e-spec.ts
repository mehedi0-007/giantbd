import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';
import { TransformResponseInterceptor } from './../src/common/interceptors/transform-response.interceptor';
import { GlobalExceptionFilter } from './../src/common/filters/global-exception.filter';

describe('Inventory API (e2e)', () => {
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
    locationId: '',
    masterProductId: '',
    variantProductId: '',
    batchId: '',
    batchItemId: '',
    stockOutId: '',
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

    let role = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    if (!role) {
      role = await prisma.role.create({ data: { name: 'SUPER_ADMIN' } });
      shouldDeleteRole = true;
    }
    testRoleId = role.id;

    const testUser = await prisma.user.create({
      data: {
        name: 'Inventory Test Admin',
        email: `inv_admin_${ts}@example.com`,
        password: 'password123', // In a real app we'd hash, but for auth bypass or login we might need to actually login via API
        gender: 'MALE' as any,
        phone: `888${ts}`,
        roleId: testRoleId,
      }
    });
    testUserId = testUser.id;

    // We must login via API to get the token, which requires a hashed password in DB if the API checks it.
    // Instead of creating user via Prisma, let's create via API to ensure password hashing happens
    await prisma.user.delete({ where: { id: testUserId } });
    const userRes = await request(app.getHttpServer())
      .post('/api/users/register')
      .send({
        name: 'Inventory Test Admin',
        email: `inv_admin_${ts}@example.com`,
        password: 'password123',
        gender: 'MALE',
        phone: `888${ts}`,
        roleId: testRoleId,
      });
    testUserId = userRes.body.data.id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: `inv_admin_${ts}@example.com`, password: 'password123' });
    accessToken = loginRes.body.data.accessToken;

    // Seed master data via Prisma for speed
    const cat = await prisma.category.create({ data: { name: `Cat_${ts}` } });
    testIds.categoryId = cat.id;
    const subCat = await prisma.subCategory.create({ data: { name: `SubCat_${ts}`, categoryId: cat.id } });
    testIds.subCategoryId = subCat.id;
    const color = await prisma.color.create({ data: { name: `Color_${ts}`, code: '#000' } });
    testIds.colorId = color.id;
    const material = await prisma.material.create({ data: { name: `Mat_${ts}` } });
    testIds.materialId = material.id;
    
    const wh = await prisma.warehouse.create({ data: { name: `WH_${ts}`, code: `W${ts}` } });
    testIds.warehouseId = wh.id;
    const zone = await prisma.zone.create({ data: { name: `Z_${ts}`, code: `Z${ts}`, warehouseId: wh.id } });
    testIds.zoneId = zone.id;
    const subZone = await prisma.subZone.create({ data: { name: `SZ_${ts}`, code: `SZ${ts}`, zoneId: zone.id } });
    testIds.subZoneId = subZone.id;
    const rack = await prisma.rack.create({ data: { name: `R_${ts}`, code: `R${ts}`, subZoneId: subZone.id } });
    testIds.rackId = rack.id;
    const loc = await prisma.storageLocation.create({
      data: { name: `Loc_${ts}`, code: `LBC_${ts}`, warehouseId: wh.id, zoneId: zone.id, subZoneId: subZone.id, rackId: rack.id }
    });
    testIds.locationId = loc.id;

    const mp = await prisma.masterProduct.create({
      data: { name: `MP_${ts}`, sku: `MPSKU_${ts}`, categoryId: cat.id, subCategoryId: subCat.id, materialId: material.id, creatorId: testUserId }
    });
    testIds.masterProductId = mp.id;

    const vp = await prisma.variantProduct.create({
      data: { name: `VP_${ts}`, sku: `VPSKU_${ts}`, barcode: `VPBC_${ts}`, size: 'L', colorId: color.id, gender: 'MALE', uom: 'PAIR', itemsPerPacket: 10, masterProductId: mp.id, creatorId: testUserId, categoryId: cat.id, subCategoryId: subCat.id }
    });
    testIds.variantProductId = vp.id;
  });

  afterAll(async () => {
    // Cleanup inventory
    await prisma.stockOutItem.deleteMany({});
    await prisma.stockOut.deleteMany({});
    await prisma.inventoryMovement.deleteMany({});
    await prisma.batchItem.deleteMany({});
    await prisma.batch.deleteMany({});
    await prisma.document.deleteMany({});

    // Cleanup master data
    await prisma.variantProduct.deleteMany({ where: { id: testIds.variantProductId }});
    await prisma.masterProduct.deleteMany({ where: { id: testIds.masterProductId }});
    
    await prisma.storageLocation.deleteMany({ where: { id: testIds.locationId }});
    await prisma.rack.deleteMany({ where: { id: testIds.rackId }});
    await prisma.subZone.deleteMany({ where: { id: testIds.subZoneId }});
    await prisma.zone.deleteMany({ where: { id: testIds.zoneId }});
    await prisma.warehouse.deleteMany({ where: { id: testIds.warehouseId }});
    
    await prisma.subCategory.deleteMany({ where: { id: testIds.subCategoryId }});
    await prisma.category.deleteMany({ where: { id: testIds.categoryId }});
    await prisma.color.deleteMany({ where: { id: testIds.colorId }});
    await prisma.material.deleteMany({ where: { id: testIds.materialId }});
    
    if (testUserId) await prisma.user.deleteMany({ where: { id: testUserId } });
    if (shouldDeleteRole && testRoleId) await prisma.role.deleteMany({ where: { id: testRoleId } });
    
    await app.close();
  });

  describe('Stock-In', () => {
    it('previews a stock-in', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/inventory/stock-in/preview')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          masterProductId: testIds.masterProductId,
          colorId: testIds.colorId,
          gender: 'MALE'
        })
        .expect(200);

      expect(res.body.data).toBeDefined();
    });

    it('executes a stock-in', async () => {
      const payload = {
        masterProductId: testIds.masterProductId,
        productionDate: new Date().toISOString(),
        note: 'Initial Stock In',
        items: [
          {
            variantProductId: testIds.variantProductId,
            receivedQty: 50,
            packetCount: 5,
            itemsPerPacket: 10,
            locationId: testIds.locationId,
          }
        ]
      };

      const res = await request(app.getHttpServer())
        .post('/api/inventory/stock-in')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);
      
      expect(res.body.data).toHaveProperty('batch'); // Batch
      expect(res.body.data.batch).toHaveProperty('id'); 
      testIds.batchId = res.body.data.batch.id;
      testIds.batchItemId = res.body.data.batchItems[0].id;
    });

    it('fetches batches', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/inventory/batches')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(Array.isArray(res.body.data)).toBeTruthy();
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('fetches batch by id and gets batch items', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/inventory/batches/${testIds.batchId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(res.body.data.id).toBe(testIds.batchId);
      expect(res.body.data.batchItems.length).toBeGreaterThan(0);
    });

    it('updates a batch item', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/inventory/batch-items/${testIds.batchItemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ note: 'Updated note' })
        .expect(200);
      
      expect(res.body.message).toBe('Batch item updated successfully');
    });

    it('updates a batch (metadata)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/inventory/batches/${testIds.batchId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ batch_number: `BN_${ts}_Updated` })
        .expect(200);

      expect(res.body.message).toBeDefined();
    });
  });

  describe('Queries', () => {
    it('gets stock overview', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/inventory/stock')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    it('gets movements ledger', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/inventory/movements')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });
  });

  describe('Stock-Out', () => {
    it('executes a stock-out', async () => {
      const payload = {
        type: 'DIRECT_SALE',
        note: 'Outgoing shipment',
        items: [
          {
            batchItemId: testIds.batchItemId,
            issueQty: 10,
          }
        ]
      };

      const res = await request(app.getHttpServer())
        .post('/api/inventory/stock-out')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload);
        
      if (res.status !== 201) {
        console.error('Stock-Out Failed:', res.body);
      }
      expect(res.status).toBe(201);
      
      expect(res.body.data).toHaveProperty('challan');
      expect(res.body.data.challan).toHaveProperty('id');
      testIds.stockOutId = res.body.data.challan.id;
    });

    it('fetches stock-outs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/inventory/stock-out')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    it('fetches stock-out by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/inventory/stock-out/${testIds.stockOutId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(res.body.data.id).toBe(testIds.stockOutId);
    });

    it('updates stock-out status to DELIVERED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/inventory/stock-out/${testIds.stockOutId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'DELIVERED', note: 'All goods arrived safely' })
        .expect(200);
      
      expect(res.body.data.status).toBe('DELIVERED');
    });

    it('updates stock-out status to PAYMENT_RECEIVED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/inventory/stock-out/${testIds.stockOutId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'PAYMENT_RECEIVED', note: 'Payment received' })
        .expect(200);

      expect(res.body.data.status).toBe('PAYMENT_RECEIVED');
    });

    it('previews stock-out items by PO', async () => {
      // First create a PO to preview from
      const buyer = await prisma.buyer.create({ data: { name: `B_${ts}`, code: `BC_${ts}` } });
      const po = await prisma.pO.create({
        data: {
          poNumber: `POINV_${ts}`, buyerId: buyer.id,
          items: { create: [{ variantProductId: testIds.variantProductId, quantity: 100 }] }
        }
      });

      const res = await request(app.getHttpServer())
        .get(`/api/inventory/stock-out/preview-po/${po.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();

      // Cleanup
      await prisma.pOItem.deleteMany({ where: { poId: po.id } });
      await prisma.pO.delete({ where: { id: po.id } });
      await prisma.buyer.delete({ where: { id: buyer.id } });
    });

    // Note: Once a stock-out is DELIVERED, cancelling it might throw an error depending on business logic.
    // If it throws an error, that's correct, but for testing the cancel endpoint, we might want a new one or we just accept the 400.
    // Let's create a temporary stock-out and cancel it.
    it('cancels a stock-out', async () => {
      // 1. Create a fresh stock out
      const payload = {
        type: 'DIRECT_SALE',
        destination: 'Test Destination',
        note: 'E2E stock-out test',
        items: [{ batchItemId: testIds.batchItemId, issueQty: 10 }]
      };
      const createRes = await request(app.getHttpServer())
        .post('/api/inventory/stock-out')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload);
        
      if (createRes.status !== 201) {
        console.error('Stock-Out Cancel Creation Failed:', createRes.body);
      }
      expect(createRes.status).toBe(201);
      
      const tempId = createRes.body.data.challan.id;

      // 2. Cancel it
      const cancelRes = await request(app.getHttpServer())
        .post(`/api/inventory/stock-out/${tempId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ note: 'Mistake' })
        .expect(201);
      
      expect([200, 201]).toContain(cancelRes.status);
      expect(cancelRes.body.data.status).toBe('CANCELLED');
    });
  });
});
