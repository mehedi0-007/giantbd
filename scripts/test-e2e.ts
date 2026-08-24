import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TransformResponseInterceptor } from '../src/common';

async function runTestSuite() {
  console.log('🚀 Initializing E2E API Test Suite for Giant BD ERP Backend...\n');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleFixture.createNestApplication();

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

  await app.init();
  const server = app.getHttpServer();

  let authToken = '';
  let refreshToken = '';
  let createdRoleId = '';
  let categoryId = '';
  let subCategoryId = '';
  let colorId = '';
  let materialId = '';
  let masterProductId = '';
  let variantId = '';

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      if (err.response?.body) {
        console.error(`     Response: ${JSON.stringify(err.response.body)}`);
      }
      failed++;
    }
  }

  console.log('--- 1. Authentication & Security ---');

  await test('POST /api/auth/login (Invalid credentials should fail with 401)', async () => {
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: 'admin@mail.com', password: 'wrongpassword' });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('POST /api/auth/login (Valid credentials should return tokens and user)', async () => {
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: 'admin@mail.com', password: 'password' });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.data?.accessToken) throw new Error('Missing accessToken in response data');
    authToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
    if (res.body.data.user.role.name !== 'SUPER_ADMIN') throw new Error('Role name is not SUPER_ADMIN');
  });

  await test('POST /api/auth/refresh (Valid refresh token should generate new tokens)', async () => {
    const res = await request(server)
      .post('/api/auth/refresh')
      .send({ refreshToken });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.body.data?.accessToken) throw new Error('Missing new accessToken');
    authToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  await test('GET /api/users (Unauthenticated request should fail with 401)', async () => {
    const res = await request(server).get('/api/users');
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  console.log('\n--- 2. Users Management ---');

  await test('GET /api/users/me (Fetch authenticated Super Admin profile)', async () => {
    const res = await request(server)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${authToken}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.body.data.email !== 'admin@mail.com') throw new Error('Incorrect user email');
  });

  await test('GET /api/users (Paginated users list)', async () => {
    const res = await request(server)
      .get('/api/users?page=1&per_page=10')
      .set('Authorization', `Bearer ${authToken}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.body.data)) throw new Error('Expected data to be an array');
    if (!res.body.meta?.total) throw new Error('Expected meta.total in paginated response');
  });

  console.log('\n--- 3. Permissions & Roles ---');

  await test('GET /api/permissions (Fetch all permissions)', async () => {
    const res = await request(server)
      .get('/api/permissions')
      .set('Authorization', `Bearer ${authToken}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.body.data) || res.body.data.length === 0) throw new Error('No permissions returned');
  });

  await test('GET /api/permissions?grouped=true (Fetch permissions grouped by module)', async () => {
    const res = await request(server)
      .get('/api/permissions?grouped=true')
      .set('Authorization', `Bearer ${authToken}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.body.data.USERS || !res.body.data.CATALOG) throw new Error('Missing grouped modules USERS or CATALOG');
  });

  await test('POST /api/roles (Create custom role TEST_OPERATOR)', async () => {
    const res = await request(server)
      .post('/api/roles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `TEST_OPERATOR_${Date.now()}`,
        description: 'Test operator role for verification',
      });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Expected 200/201, got ${res.status}: ${JSON.stringify(res.body)}`);
    createdRoleId = res.body.data.id;
  });

  await test('GET /api/roles (List roles with counts)', async () => {
    const res = await request(server)
      .get('/api/roles')
      .set('Authorization', `Bearer ${authToken}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.body.data)) throw new Error('Expected data to be array');
  });

  await test('DELETE /api/roles/:id (Delete test role)', async () => {
    const res = await request(server)
      .delete(`/api/roles/${createdRoleId}`)
      .set('Authorization', `Bearer ${authToken}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  console.log('\n--- 4. Product Catalog: Categories & Attributes ---');

  await test('POST /api/categories (Create category Footwear)', async () => {
    const categoryName = `Footwear_${Date.now()}`;
    const res = await request(server)
      .post('/api/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: categoryName });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Expected 200/201, got ${res.status}: ${JSON.stringify(res.body)}`);
    categoryId = res.body.data.id;
  });

  await test('POST /api/categories/subcategories (Create subcategory Running Shoes)', async () => {
    const res = await request(server)
      .post('/api/categories/subcategories')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Running Shoes',
        categoryId,
      });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Expected 200/201, got ${res.status}: ${JSON.stringify(res.body)}`);
    subCategoryId = res.body.data.id;
  });

  await test('POST /api/colors (Create color Pitch Black)', async () => {
    const colorName = `Pitch_Black_${Date.now()}`;
    const res = await request(server)
      .post('/api/colors')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: colorName,
        code: '#0A0A0A',
        description: 'Deep midnight black',
      });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Expected 200/201, got ${res.status}: ${JSON.stringify(res.body)}`);
    colorId = res.body.data.id;
  });

  await test('POST /api/materials (Create material Breathable Mesh)', async () => {
    const materialName = `Breathable_Mesh_${Date.now()}`;
    const res = await request(server)
      .post('/api/materials')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: materialName,
        description: 'Engineered lightweight mesh fabric',
      });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Expected 200/201, got ${res.status}: ${JSON.stringify(res.body)}`);
    materialId = res.body.data.id;
  });

  console.log('\n--- 5. Product Catalog: Master & Variant Products ---');

  await test('POST /api/master-products (Create Master Product style)', async () => {
    const res = await request(server)
      .post('/api/master-products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Apex Cloud Strider',
        categoryId,
        subCategoryId,
        materialId,
        description: 'High-performance athletic running footwear',
      });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Expected 200/201, got ${res.status}: ${JSON.stringify(res.body)}`);
    masterProductId = res.body.data.id;
    if (!res.body.data.sku) throw new Error('Auto-generated SKU missing');
  });

  await test('POST /api/variants (Create single Variant Product)', async () => {
    const res = await request(server)
      .post('/api/variants')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        masterProductId,
        size: '42',
        colorId,
        gender: 'MALE',
        uom: 'PAIR',
        itemsPerPacket: 1,
        costPrice: 28.5,
        sellingPrice: 75.0,
        mrp: 90.0,
      });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Expected 200/201, got ${res.status}: ${JSON.stringify(res.body)}`);
    variantId = res.body.data.id;
    if (!res.body.data.barcode) throw new Error('Auto-generated Barcode missing');
    if (!res.body.data.sku) throw new Error('Auto-generated SKU missing');
  });

  await test('POST /api/variants/bulk (Matrix Bulk Variant Generation across sizes)', async () => {
    const res = await request(server)
      .post('/api/variants/bulk')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        masterProductId,
        colorIds: [colorId],
        sizes: ['40', '41', '43', '44'],
        gender: 'MALE',
        uom: 'PAIR',
        itemsPerPacket: 1,
        costPrice: 28.5,
        sellingPrice: 75.0,
        mrp: 90.0,
      });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Expected 200/201, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!Array.isArray(res.body.data) || res.body.data.length !== 4) {
      throw new Error(`Expected 4 generated variants, got ${res.body.data?.length}`);
    }
  });

  await test('GET /api/variants (List variants with calculated totalAvailableStock)', async () => {
    const res = await request(server)
      .get(`/api/variants?masterProductId=${masterProductId}`)
      .set('Authorization', `Bearer ${authToken}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.body.data.length < 5) throw new Error(`Expected at least 5 variants, got ${res.body.data.length}`);
    if (res.body.data[0].totalAvailableStock === undefined) throw new Error('totalAvailableStock missing in variant');
  });

  await test('GET /api/variants/:id (Fetch single variant with details)', async () => {
    const res = await request(server)
      .get(`/api/variants/${variantId}`)
      .set('Authorization', `Bearer ${authToken}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.body.data.id !== variantId) throw new Error('Incorrect variant returned');
  });

  await app.close();

  console.log('\n========================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
