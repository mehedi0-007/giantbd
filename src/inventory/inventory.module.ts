import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StockInService } from './services/stock-in.service';
import { StockInController } from './controllers/stock-in.controller';
import { InventoryService } from './services/inventory.service';
import { InventoryController } from './controllers/inventory.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    StockInController,
    InventoryController,
  ],
  providers: [
    StockInService,
    InventoryService,
  ],
})
export class InventoryModule {}
