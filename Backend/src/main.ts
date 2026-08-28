import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import {
  GlobalExceptionFilter,
  IdempotencyInterceptor,
  LoggingInterceptor,
  TransformResponseInterceptor,
} from './common';
import cookieParser from 'cookie-parser';

function validateEnv() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('\x1b[31m%s\x1b[0m', '════════════════════════════════════════════════════════════');
    console.error('\x1b[31m%s\x1b[0m', '❌ FATAL ERROR: Missing required environment variable(s):');
    missing.forEach((v) => console.error('\x1b[31m%s\x1b[0m', `   - ${v}`));
    console.error('\x1b[31m%s\x1b[0m', 'Please configure these in your .env file before starting the server.');
    console.error('\x1b[31m%s\x1b[0m', '════════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());

  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((u) => u.trim())
    : isProd
    ? []
    : true; // Allow any local dev origin in non-production

  if (isProd && !process.env.FRONTEND_URL) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: FRONTEND_URL is not set. CORS will deny all cross-origin requests in production.');
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new IdempotencyInterceptor(),
    new TransformResponseInterceptor(),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
