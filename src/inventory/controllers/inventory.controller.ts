import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from '../services/inventory.service';
import {
  QueryBatchesDTO,
  QueryMovementsDTO,
  QueryStockDTO,
  UpdateBatchDTO,
  UpdateBatchItemDTO,
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

  @Patch('batches/:id')
  @RequirePermissions('inventory:update')
  async updateBatch(
    @Param('id') id: string,
    @Body() dto: UpdateBatchDTO,
  ) {
    return this.inventoryService.updateBatch(id, dto);
  }

  @Patch('batch-items/:id')
  @RequirePermissions('inventory:update')
  async updateBatchItem(
    @Param('id') id: string,
    @Body() dto: UpdateBatchItemDTO,
  ) {
    return this.inventoryService.updateBatchItem(id, dto);
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
