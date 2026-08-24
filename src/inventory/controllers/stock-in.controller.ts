import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StockInService } from '../services/stock-in.service';
import { PreviewStockInDTO, StockInDTO } from '../dto/stock-in.dto';
import { PermissionsGuard, RequirePermissions } from '../../common';

@Controller('inventory')
@UseGuards(PermissionsGuard)
export class StockInController {
  constructor(private readonly stockInService: StockInService) {}

  @Get('stock-in/preview')
  @RequirePermissions('inventory:receive')
  async previewStockIn(@Query() dto: PreviewStockInDTO) {
    return this.stockInService.previewStockIn(dto);
  }

  @Post('stock-in')
  @RequirePermissions('inventory:receive')
  async executeStockIn(@Body() dto: StockInDTO) {
    return this.stockInService.executeStockIn(dto);
  }
}
