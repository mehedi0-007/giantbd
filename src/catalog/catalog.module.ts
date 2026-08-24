import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoriesService } from './services/categories.service';
import { CategoriesController } from './controllers/categories.controller';
import { AttributesService } from './services/attributes.service';
import { AttributesController } from './controllers/attributes.controller';
import { MasterProductsService } from './services/master-products.service';
import { MasterProductsController } from './controllers/master-products.controller';
import { VariantProductsService } from './services/variant-products.service';
import { VariantProductsController } from './controllers/variant-products.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    CategoriesController,
    AttributesController,
    MasterProductsController,
    VariantProductsController,
  ],
  providers: [
    CategoriesService,
    AttributesService,
    MasterProductsService,
    VariantProductsService,
  ],
  exports: [
    CategoriesService,
    AttributesService,
    MasterProductsService,
    VariantProductsService,
  ],
})
export class CatalogModule {}
