import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { CatalogModule } from './products/catalog.module';
import { AttributesModule } from './attributes/attributes.module';
import { InventoryModule } from './inventory/inventory.module';
import { BuyerModule } from './buyers/buyers.module';
import { LCModule } from './lc/lc.module';
import { JwtAuthGuard } from './common/guards/jwt.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 50,
      },
    ]),
    PrismaModule,
    AuthModule,
    UserModule,
    RolesModule,
    PermissionsModule,
    CatalogModule,
    AttributesModule,
    InventoryModule,
    BuyerModule,
    LCModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }

