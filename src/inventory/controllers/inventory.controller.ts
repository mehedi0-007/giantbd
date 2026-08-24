import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from '../services/inventory.service';
import {
  QueryBatchesDTO,
  QueryMovementsDTO,
  QueryStockDTO,
} from '../dto/stock-query.dto';
import { PermissionsGuard, RequirePermissions } from '../../common';

@Controller('inventory')
@UseGuards(PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('batches')
  @RequirePermissions('inventory:read')
  async findAllBatches(@Query() query: QueryBatchesDTO) {
    return this.inventoryService.findAllBatches(query);
  }

  @Get('batches/:id')
  @RequirePermissions('inventory:read')
  async findBatchById(@Param('id') id: string) {
    return this.inventoryService.findBatchById(id);
  }

  @Get('stock')
  @RequirePermissions('inventory:read')
  async getStockOverview(@Query() query: QueryStockDTO) {
    return this.inventoryService.getStockOverview(query);
  }

  @Get('movements')
  @RequirePermissions('inventory:read')
  async getMovementsLedger(@Query() query: QueryMovementsDTO) {
    return this.inventoryService.getMovementsLedger(query);
  }
}
