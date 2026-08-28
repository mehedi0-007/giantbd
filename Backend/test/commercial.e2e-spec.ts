import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { GlobalExceptionFilter, TransformResponseInterceptor } from '../src/common';

describe('Commercial API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let testUserId: string;

  const testIds: any = {};
  const ts = Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();
    prisma = app.get(PrismaService);

    // Get super admin role
    let role = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    if (!role) {
      role = await prisma.role.create({
        data: { name: 'SUPER_ADMIN', description: 'Super Admin Role' },
      });
    }

    // Create a test user for auth
    const registerEmail = `real_comm_${ts}@test.com`;
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        name: 'Real Comm Tester',
        email: registerEmail,
        password: hashedPassword,
        phone: `+9876543${ts.toString().slice(-4)}`,
        gender: 'MALE',
        roleId: role.id,
      },
    });
    testUserId = user.id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: registerEmail, password: 'password123' });
    
    if (loginRes.status !== 200) {
      console.error('Login Failed', loginRes.body);
    }
    accessToken = loginRes.body.data.accessToken;

    // Create a Master Data hierarchy for PO Items
    const cat = await prisma.category.create({ data: { name: `C_${ts}` } });
    testIds.categoryId = cat.id;
    const subCat = await prisma.subCategory.create({ data: { name: `SC_${ts}`, categoryId: cat.id } });
    testIds.subCategoryId = subCat.id;
    const material = await prisma.material.create({ data: { name: `M_${ts}` } });
    testIds.materialId = material.id;
    const color = await prisma.color.create({ data: { name: `Col_${ts}` } });
    testIds.colorId = color.id;
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
    // Cleanup only records created during this test run (scoped by testIds)
    if (testIds.poId) {
      await prisma.pOItem.deleteMany({ where: { poId: testIds.poId } });
      await prisma.pO.deleteMany({ where: { id: testIds.poId } });
    }
    if (testIds.lcId) await prisma.lC.deleteMany({ where: { id: testIds.lcId } });
    if (testIds.buyerId) await prisma.buyer.deleteMany({ where: { id: testIds.buyerId } });

    // Cleanup test master data
    if (testIds.variantProductId)
      await prisma.variantProduct.deleteMany({ where: { id: testIds.variantProductId } });
    if (testIds.masterProductId)
      await prisma.masterProduct.deleteMany({ where: { id: testIds.masterProductId } });
    if (testUserId)
      await prisma.masterProduct.deleteMany({ where: { creatorId: testUserId } });

    if (testIds.subCategoryId)
      await prisma.subCategory.deleteMany({ where: { id: testIds.subCategoryId } });
    if (testIds.categoryId)
      await prisma.category.deleteMany({ where: { id: testIds.categoryId } });
    if (testIds.colorId)
      await prisma.color.deleteMany({ where: { id: testIds.colorId } });
    if (testIds.materialId)
      await prisma.material.deleteMany({ where: { id: testIds.materialId } });

    // Cleanup test users (scoped by known email patterns from this run)
    await prisma.user.deleteMany({
      where: { email: { in: [`commercial_${ts}@test.com`, `real_comm_${ts}@test.com`] } }
    });

    await app.close();
  });

  describe('Buyers', () => {
    it('creates a buyer', async () => {
      const payload = {
        name: `Buyer_${ts}`,
        code: `B_${ts}`,
        email: `buyer_${ts}@test.com`,
        country: 'USA'
      };

      const res = await request(app.getHttpServer())
        .post('/api/buyers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);
      
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe(payload.name);
      testIds.buyerId = res.body.data.id;
    });

    it('fetches buyers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/buyers')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(Array.isArray(res.body.data)).toBeTruthy();
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('fetches buyer by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/buyers/${testIds.buyerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(res.body.data.id).toBe(testIds.buyerId);
    });

    it('updates a buyer', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/buyers/${testIds.buyerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ address: '123 Test St' })
        .expect(200);
      
      expect(res.body.data.address).toBe('123 Test St');
    });

    it('deletes a buyer', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/buyers/${testIds.buyerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    it('restores a buyer', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/buyers/${testIds.buyerId}/restore`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
      
      expect(res.body.data.status).toBe('ACTIVE');
    });
  });

  describe('Letters of Credit (LC)', () => {
    it('creates an LC', async () => {
      const payload = {
        lcNumber: `LC-${ts}`,
        buyerId: testIds.buyerId,
        issueDate: new Date().toISOString(),
        status: 'OPEN'
      };

      const res = await request(app.getHttpServer())
        .post('/api/lc')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);
      
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.lcNumber).toBe(payload.lcNumber);
      testIds.lcId = res.body.data.id;
    });

    it('fetches LCs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/lc')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(Array.isArray(res.body.data)).toBeTruthy();
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('fetches LC by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/lc/${testIds.lcId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(res.body.data.id).toBe(testIds.lcId);
    });

    it('updates an LC', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/lc/${testIds.lcId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ remarks: 'Updated remarks' })
        .expect(200);
      
      expect(res.body.data.remarks).toBe('Updated remarks');
    });

    it('deletes an LC', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/lc/${testIds.lcId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(res.body.message).toMatch(/cancelled|deleted/i);
    });

    it('restores an LC', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/lc/${testIds.lcId}/restore`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
      
      expect(res.body.message).toMatch(/success|restored/i);
    });
  });

  describe('Purchase Orders (PO)', () => {
    it('creates a PO', async () => {
      const payload = {
        poNumber: `PO-${ts}`,
        buyerId: testIds.buyerId,
        lcId: testIds.lcId,
        status: 'DRAFT',
        items: [
          {
            variantProductId: testIds.variantProductId,
            quantity: 1000
          }
        ]
      };

      const res = await request(app.getHttpServer())
        .post('/api/po')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);
      
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.poNumber).toBe(payload.poNumber);
      testIds.poId = res.body.data.id;
    });

    it('fetches POs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/po')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(Array.isArray(res.body.data)).toBeTruthy();
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('fetches PO by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/po/${testIds.poId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(res.body.data.id).toBe(testIds.poId);
    });

    it('updates a PO', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/po/${testIds.poId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ remarks: 'Urgent' })
        .expect(200);
      
      expect(res.body.data.remarks).toBe('Urgent');
    });

    it('adds or updates PO items', async () => {
      const payload = {
        items: [
          {
            variantProductId: testIds.variantProductId,
            quantity: 1200 // Updating quantity
          }
        ]
      };

      const res = await request(app.getHttpServer())
        .post(`/api/po/${testIds.poId}/items`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);
      
      expect(res.body.data.totalQuantity).toBe(1200);
    });

    it('deletes a PO', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/po/${testIds.poId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(res.body.message).toMatch(/cancelled|deleted/i);
    });

    it('restores a PO', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/po/${testIds.poId}/restore`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
      
      expect(res.body.message).toMatch(/success|restored/i);
    });
  });
});
