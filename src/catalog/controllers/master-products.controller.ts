import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MasterProductsService } from '../services/master-products.service';
import {
  CreateMasterProductDTO,
  QueryMasterProductDTO,
  UpdateMasterProductDTO,
} from '../dto/master-product.dto';
import { CurrentUser, PermissionsGuard, RequirePermissions } from '../../common';

@Controller('master-products')
@UseGuards(PermissionsGuard)
export class MasterProductsController {
  constructor(private readonly masterProductsService: MasterProductsService) {}

  @Post()
  @RequirePermissions('catalog:create')
  async create(
    @Body() dto: CreateMasterProductDTO,
    @CurrentUser('id') creatorId: string,
  ) {
    return this.masterProductsService.create(dto, creatorId);
  }

  @Get()
  @RequirePermissions('catalog:read')
  async findAll(@Query() query: QueryMasterProductDTO) {
    return this.masterProductsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('catalog:read')
  async findById(@Param('id') id: string) {
    return this.masterProductsService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions('catalog:update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMasterProductDTO,
  ) {
    return this.masterProductsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('catalog:delete')
  async delete(@Param('id') id: string) {
    return this.masterProductsService.delete(id);
  }
}
