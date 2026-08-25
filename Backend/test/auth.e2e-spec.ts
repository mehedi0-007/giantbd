import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import cookieParser from 'cookie-parser';
import { PrismaService } from './../src/prisma/prisma.service';
import { TransformResponseInterceptor } from './../src/common/interceptors/transform-response.interceptor';
import { GlobalExceptionFilter } from './../src/common/filters/global-exception.filter';

describe('Auth & User Management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testRoleId: string;
  let testUserId: string;
  let accessToken: string;
  let refreshTokenCookie: string;

  const ts = Date.now();
  const testUser = {
    name: 'E2E Auth User',
    email: `e2e_auth_${ts}@example.com`,
    password: 'password123',
    gender: 'MALE',
    phone: `${ts.toString().slice(-10)}`,
  };

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

    // Find or create SUPER_ADMIN role
    let role = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    if (!role) {
      role = await prisma.role.create({ data: { name: 'SUPER_ADMIN' } });
    }
    testRoleId = role.id;

    // Register via API (ensures password is hashed)
    const regRes = await request(app.getHttpServer())
      .post('/api/users/register')
      .send({ ...testUser, roleId: testRoleId });

    expect(regRes.status).toBe(201);
    testUserId = regRes.body.data.id;

    // Login to get tokens
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(loginRes.status).toBe(200);
    accessToken = loginRes.body.data.accessToken;
    // Extract the refresh token cookie
    const cookies = loginRes.headers['set-cookie'];
    refreshTokenCookie = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  });

  afterAll(async () => {
    if (testUserId) await prisma.user.deleteMany({ where: { email: { contains: `e2e_auth_${ts}` } } });
    await app.close();
  });

  // ─── Auth endpoints ───────────────────────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    it('refreshes the access token using the refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', refreshTokenCookie)
        .expect(200);

      expect(res.body.data).toHaveProperty('accessToken');
      // Update token for subsequent tests
      accessToken = res.body.data.accessToken;
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('changes the user password successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ oldPassword: testUser.password, newPassword: 'newpassword456' })
        .expect(200);

      expect(res.body.message).toBeDefined();
    });

    it('can login with the new password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'newpassword456' })
        .expect(200);

      accessToken = res.body.data.accessToken;
      const cookies = res.headers['set-cookie'];
      refreshTokenCookie = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    });

    it('rejects login with the old password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('logs out and clears the refresh token cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.message).toBeDefined();
      // Cookie should be cleared (empty value or expired)
      const cookies = res.headers['set-cookie'] as string[] | string | undefined;
      const cookiesArr = Array.isArray(cookies) ? cookies : (cookies ? [cookies] : []);
      const refreshCookie = cookiesArr.find((c: string) => c.startsWith('refreshToken='));
      // Should be cleared (empty value)
      if (refreshCookie) {
        expect(refreshCookie).toMatch(/refreshToken=;|Max-Age=0/i);
      }
    });
  });

  // ─── User Management endpoints ───────────────────────────────────────────

  describe('GET /api/users', () => {
    it('lists all users (admin)', async () => {
      // Re-login since we logged out
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'newpassword456' });
      accessToken = loginRes.body.data.accessToken;

      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBeTruthy();
    });
  });

  describe('GET /api/users/:id', () => {
    it('fetches a user by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(testUserId);
      expect(res.body.data.email).toBe(testUser.email);
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('updates user name', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Auth User' })
        .expect(200);

      expect(res.body.data.name).toBe('Updated Auth User');
    });
  });

  describe('DELETE & Restore /api/users/:id', () => {
    it('soft-deletes a user', async () => {
      // Create a separate user to delete so we don't break other tests
      const delUser = await request(app.getHttpServer())
        .post('/api/users/register')
        .send({
          name: 'To Delete',
          email: `del_${ts}@example.com`,
          password: 'password123',
          gender: 'MALE',
          phone: `${(ts + 1).toString().slice(-10)}`,
          roleId: testRoleId,
        });
      const delUserId = delUser.body.data.id;

      const res = await request(app.getHttpServer())
        .delete(`/api/users/${delUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.message).toBeDefined();

      // Restore it
      const restoreRes = await request(app.getHttpServer())
        .post(`/api/users/${delUserId}/restore`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(restoreRes.body.message).toBeDefined();

      // Cleanup
      await prisma.user.deleteMany({ where: { id: delUserId } });
    });
  });
});
