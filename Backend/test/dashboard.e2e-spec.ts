import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';
import { TransformResponseInterceptor } from './../src/common/interceptors/transform-response.interceptor';
import { GlobalExceptionFilter } from './../src/common/filters/global-exception.filter';

describe('Dashboard Metrics API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let testUserId: string;

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
    }

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const testUser = await prisma.user.create({
      data: {
        name: 'Dashboard Test Admin',
        email: `dash_admin_${ts}@example.com`,
        password: hashedPassword,
        gender: 'MALE' as any,
        phone: `777${ts}`,
        roleId: role.id,
      },
    });
    testUserId = testUser.id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: `dash_admin_${ts}@example.com`, password: 'password123' });
    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
    await app.close();
  });

  it('GET /api/dashboard/metrics returns structured KPI and chart data in < 50ms', async () => {
    const start = Date.now();
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/metrics')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500); // Fast execution check

    const body = res.body.data;
    expect(body).toHaveProperty('kpi');
    expect(body.kpi).toHaveProperty('totalStockPairs');
    expect(body.kpi).toHaveProperty('lowStockCount');
    expect(body.kpi).toHaveProperty('activePoCount');
    expect(body.kpi).toHaveProperty('poFulfillmentRate');
    expect(body.kpi).toHaveProperty('activeLcCount');
    expect(body.kpi).toHaveProperty('totalBuyersCount');

    expect(body).toHaveProperty('movementTrends');
    expect(Array.isArray(body.movementTrends)).toBeTruthy();

    expect(body).toHaveProperty('poDistribution');
    expect(Array.isArray(body.poDistribution)).toBeTruthy();

    expect(body).toHaveProperty('activeLcs');
    expect(Array.isArray(body.activeLcs)).toBeTruthy();

    expect(body).toHaveProperty('pendingChallans');
    expect(Array.isArray(body.pendingChallans)).toBeTruthy();

    expect(body).toHaveProperty('recentStocks');
    expect(Array.isArray(body.recentStocks)).toBeTruthy();
  });
});
