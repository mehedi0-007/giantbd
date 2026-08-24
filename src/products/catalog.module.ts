import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MasterProductsService } from './services/master-products.service';
import { MasterProductsController } from './controllers/master-products.controller';
import { VariantProductsService } from './services/variant-products.service';
import { VariantProductsController } from './controllers/variant-products.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    MasterProductsController,
    VariantProductsController,
  ],
  providers: [
    MasterProductsService,
    VariantProductsService,
  ],
})
export class CatalogModule { }
