import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import * as fs from 'fs';
import { TransformResponseInterceptor, GlobalExceptionFilter } from '../src/common';

describe('File Uploads (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let testUserId: string;
  let testRoleId: string;

  const ts = Date.now();
  const testIds: any = {};
  const createdFiles: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
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

    (app as NestExpressApplication).useStaticAssets(join(process.cwd(), 'uploads'), {
      prefix: '/uploads/',
    });

    await app.init();
    prisma = app.get(PrismaService);

    // Get or create SUPER_ADMIN role
    let role = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    if (!role) {
      role = await prisma.role.create({ data: { name: 'SUPER_ADMIN' } });
    }
    testRoleId = role.id;

    // Login with an admin user
    const adminEmail = `uploader_admin_${ts}@test.com`;
    const regRes = await request(app.getHttpServer())
      .post('/api/users/register')
      .send({
        name: 'File Upload Admin',
        email: adminEmail,
        password: 'password123',
        gender: 'MALE',
        phone: `${ts.toString().slice(-10)}`,
        roleId: testRoleId,
      });

    testUserId = regRes.body.data.id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'password123' });

    accessToken = loginRes.body.data.accessToken;

    // Seed test master data for product, warehouse, batch
    const cat = await prisma.category.create({ data: { name: `UploadCat_${ts}` } });
    testIds.categoryId = cat.id;

    const subCat = await prisma.subCategory.create({
      data: { name: `UploadSubCat_${ts}`, categoryId: cat.id },
    });
    testIds.subCategoryId = subCat.id;

    const color = await prisma.color.create({ data: { name: `UploadCol_${ts}`, code: '#123' } });
    testIds.colorId = color.id;

    const material = await prisma.material.create({ data: { name: `UploadMat_${ts}` } });
    testIds.materialId = material.id;

    const wh = await prisma.warehouse.create({
      data: { name: `UploadWH_${ts}`, code: `UWH_${ts}` },
    });
    testIds.warehouseId = wh.id;

    const zone = await prisma.zone.create({
      data: { name: `UploadZone_${ts}`, code: `UZ_${ts}`, warehouseId: wh.id },
    });
    testIds.zoneId = zone.id;

    const loc = await prisma.storageLocation.create({
      data: { name: `UploadLoc_${ts}`, code: `ULOC_${ts}`, warehouseId: wh.id, zoneId: zone.id },
    });
    testIds.locationId = loc.id;

    const mp = await prisma.masterProduct.create({
      data: {
        name: `UploadMP_${ts}`,
        sku: `UMPSKU_${ts}`,
        categoryId: cat.id,
        subCategoryId: subCat.id,
        materialId: material.id,
        creatorId: testUserId,
      },
    });
    testIds.masterProductId = mp.id;

    const vp = await prisma.variantProduct.create({
      data: {
        name: `UploadVP_${ts}`,
        sku: `UVPSKU_${ts}`,
        barcode: `UVPBC_${ts}`,
        size: 'M',
        colorId: color.id,
        gender: 'MALE',
        uom: 'PAIR',
        itemsPerPacket: 5,
        masterProductId: mp.id,
        creatorId: testUserId,
        categoryId: cat.id,
        subCategoryId: subCat.id,
      },
    });
    testIds.variantProductId = vp.id;
  });

  afterAll(async () => {
    // Delete files created on disk
    for (const filePath of createdFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        // ignore
      }
    }

    // Cleanup DB
    if (testIds.stockOutId) {
      await prisma.stockOutItem.deleteMany({ where: { stockOutId: testIds.stockOutId } });
      await prisma.stockOut.deleteMany({ where: { id: testIds.stockOutId } });
    }
    if (testIds.batchId) {
      await prisma.document.deleteMany({ where: { batchId: testIds.batchId } });
      if (testIds.batchItemId) {
        await prisma.inventoryMovement.deleteMany({
          where: { inventoryBatchItemId: testIds.batchItemId },
        });
      }
      await prisma.inventoryMovement.deleteMany({ where: { referenceId: testIds.batchId } });
      await prisma.batchItem.deleteMany({ where: { batchId: testIds.batchId } });
      await prisma.batch.deleteMany({ where: { id: testIds.batchId } });
    }

    if (testIds.variantProductId)
      await prisma.variantProduct.deleteMany({ where: { id: testIds.variantProductId } });
    if (testIds.masterProductId)
      await prisma.masterProduct.deleteMany({ where: { id: testIds.masterProductId } });

    if (testIds.locationId)
      await prisma.storageLocation.deleteMany({ where: { id: testIds.locationId } });
    if (testIds.zoneId) await prisma.zone.deleteMany({ where: { id: testIds.zoneId } });
    if (testIds.warehouseId)
      await prisma.warehouse.deleteMany({ where: { id: testIds.warehouseId } });

    if (testIds.subCategoryId)
      await prisma.subCategory.deleteMany({ where: { id: testIds.subCategoryId } });
    if (testIds.categoryId)
      await prisma.category.deleteMany({ where: { id: testIds.categoryId } });
    if (testIds.colorId) await prisma.color.deleteMany({ where: { id: testIds.colorId } });
    if (testIds.materialId)
      await prisma.material.deleteMany({ where: { id: testIds.materialId } });

    await prisma.user.deleteMany({
      where: { email: { in: [`uploader_admin_${ts}@test.com`, `user_upload_${ts}@test.com`] } },
    });

    await app.close();
  });

  describe('1. User Registration with Avatar & Signature Upload', () => {
    it('uploads image and signature files via multipart/form-data', async () => {
      const dummyImageBuffer = Buffer.from('fake-avatar-content');
      const dummySigBuffer = Buffer.from('fake-signature-content');

      const res = await request(app.getHttpServer())
        .post('/api/users/register')
        .field('name', 'Uploaded Files User')
        .field('email', `user_upload_${ts}@test.com`)
        .field('password', 'password123')
        .field('gender', 'FEMALE')
        .field('phone', `99${ts.toString().slice(-8)}`)
        .field('roleId', testRoleId)
        .attach('image', dummyImageBuffer, 'avatar.png')
        .attach('signature', dummySigBuffer, 'signature.png')
        .expect(201);

      expect(res.body.data).toHaveProperty('image');
      expect(res.body.data).toHaveProperty('signature');
      expect(res.body.data.image).toMatch(/^uploads\/.+\.png$/);
      expect(res.body.data.signature).toMatch(/^uploads\/.+\.png$/);

      createdFiles.push(res.body.data.image);
      createdFiles.push(res.body.data.signature);

      // Verify static assets endpoint can serve them
      const imgFileName = res.body.data.image.replace('uploads/', '');
      const staticRes = await request(app.getHttpServer())
        .get(`/uploads/${imgFileName}`)
        .expect(200);

      expect(staticRes.body.toString()).toContain('fake-avatar-content');
    });
  });

  describe('2. Variant Product Picture Upload', () => {
    it('uploads a picture for a variant product', async () => {
      const dummyProductPicture = Buffer.from('fake-product-picture-content');

      const res = await request(app.getHttpServer())
        .post(`/api/variants/${testIds.variantProductId}/picture`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('picture', dummyProductPicture, 'product-shoe.jpg')
        .expect(201);

      expect(res.body.data).toHaveProperty('picture');
      expect(res.body.data.picture).toMatch(/^uploads\/.+\.jpg$/);

      createdFiles.push(res.body.data.picture);

      // Check in DB
      const updatedVariant = await prisma.variantProduct.findUnique({
        where: { id: testIds.variantProductId },
      });
      expect(updatedVariant?.picture).toBe(res.body.data.picture);
    });
  });

  describe('3. Stock-In with Document Attachment', () => {
    it('executes stock-in and attaches a challan document', async () => {
      const dummyDocBuffer = Buffer.from('fake-pdf-invoice-content');

      const itemsJson = JSON.stringify([
        {
          variantProductId: testIds.variantProductId,
          receivedQty: 20,
          packetCount: 4,
          itemsPerPacket: 5,
          locationId: testIds.locationId,
        },
      ]);

      const res = await request(app.getHttpServer())
        .post('/api/inventory/stock-in')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('masterProductId', testIds.masterProductId)
        .field('productionDate', new Date().toISOString())
        .field('note', 'Stock in with invoice doc')
        .field('items', itemsJson)
        .attach('document', dummyDocBuffer, 'supplier_invoice.pdf');

      if (res.status !== 201) {
        console.error('Stock In upload error:', JSON.stringify(res.body, null, 2));
      }
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('batch');
      testIds.batchId = res.body.data.batch.id;
      testIds.batchItemId = res.body.data.batchItems[0].id;

      // Verify Document record was created in the database and linked to batch
      const doc = await prisma.document.findFirst({
        where: { batchId: testIds.batchId },
      });

      expect(doc).toBeDefined();
      expect(doc?.name).toBe('supplier_invoice.pdf');
      expect(doc?.path).toMatch(/^uploads\/.+\.pdf$/);

      if (doc?.path) {
        createdFiles.push(doc.path);
      }
    });
  });

  describe('4. Stock-Out Status Update with Proof of Delivery Document', () => {
    it('executes a stock out and attaches proof of delivery on status update', async () => {
      // 1. Create StockOut
      const stockOutRes = await request(app.getHttpServer())
        .post('/api/inventory/stock-out')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'DIRECT_SALE',
          note: 'Direct sale dispatch',
          items: [{ batchItemId: testIds.batchItemId, issueQty: 5 }],
        })
        .expect(201);

      testIds.stockOutId = stockOutRes.body.data.challan.id;

      // 2. Update status to DELIVERED with signed receipt document
      const dummyProofBuffer = Buffer.from('signed-pod-receipt');

      const updateRes = await request(app.getHttpServer())
        .patch(`/api/inventory/stock-out/${testIds.stockOutId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .field('status', 'DELIVERED')
        .field('note', 'Delivered and signed by receiver')
        .attach('receiptDocument', dummyProofBuffer, 'signed_receipt.pdf')
        .expect(200);

      expect(updateRes.body.data.status).toBe('DELIVERED');
      expect(updateRes.body.data.receiptDocument).toMatch(/^uploads\/.+\.pdf$/);

      createdFiles.push(updateRes.body.data.receiptDocument);

      // Verify in DB
      const dbStockOut = await prisma.stockOut.findUnique({
        where: { id: testIds.stockOutId },
      });
      expect(dbStockOut?.receiptDocument).toBe(updateRes.body.data.receiptDocument);
    });
  });
});
