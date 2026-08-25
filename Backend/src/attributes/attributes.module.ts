import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductAttributesService } from './services/product-attributes.service';
import { ProductAttributesController } from './controllers/product-attributes.controller';
import { WarehouseAttributesService } from './services/warehouse-attributes.service';
import { WarehouseAttributesController } from './controllers/warehouse-attributes.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    ProductAttributesController,
    WarehouseAttributesController,
  ],
  providers: [
    ProductAttributesService,
    WarehouseAttributesService,
  ],
})
export class AttributesModule {}
