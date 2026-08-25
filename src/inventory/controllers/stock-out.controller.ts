import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { StockOutService } from '../services/stock-out.service';
import {
  CancelStockOutDTO,
  ExecuteStockOutDTO,
  QueryStockOutDTO,
  UpdateStockOutStatusDTO,
} from '../dto/stock-out.dto';
import {
  CurrentUser,
  DocumentUploadInterceptor,
  PermissionsGuard,
  RequirePermissions,
} from '../../common';

@Controller('inventory/stock-out')
@UseGuards(PermissionsGuard)
export class StockOutController {
  constructor(private readonly stockOutService: StockOutService) {}

  @Get('preview-po/:poId')
  @RequirePermissions('inventory:issue')
  async previewStockOutByPo(@Param('poId') poId: string) {
    return this.stockOutService.previewStockOutByPo(poId);
  }

  @Post()
  @RequirePermissions('inventory:issue')
  async executeStockOut(
    @Body() dto: ExecuteStockOutDTO,
    @CurrentUser('id') issuerId: string,
  ) {
    return this.stockOutService.executeStockOut(dto, issuerId);
  }

  @Get()
  @RequirePermissions('inventory:read')
  async findAll(@Query() query: QueryStockOutDTO) {
    return this.stockOutService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('inventory:read')
  async findById(@Param('id') id: string) {
    return this.stockOutService.findById(id);
  }

  @Patch(':id/status')
  @RequirePermissions('inventory:update')
  @UseInterceptors(DocumentUploadInterceptor('receiptDocument'))
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStockOutStatusDTO,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.stockOutService.updateStatus(id, dto, file);
  }

  @Post(':id/cancel')
  @RequirePermissions('inventory:cancel')
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelStockOutDTO,
  ) {
    return this.stockOutService.cancel(id, dto.note);
  }
}
