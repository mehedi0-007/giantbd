import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { VariantProductsService } from '../services/variant-products.service';
import {
  BulkCreateVariantDTO,
  CreateVariantProductDTO,
  QueryVariantProductDTO,
  UpdateVariantProductDTO,
} from '../dto/variant-product.dto';
import {
  CurrentUser,
  DocumentUploadInterceptor,
  PermissionsGuard,
  RequirePermissions,
} from '../../common';

@Controller('variants')
@UseGuards(PermissionsGuard)
export class VariantProductsController {
  constructor(private readonly variantProductsService: VariantProductsService) {}

  @Post()
  @RequirePermissions('catalog:create')
  async create(
    @Body() dto: CreateVariantProductDTO,
    @CurrentUser('id') creatorId: string,
  ) {
    return this.variantProductsService.create(dto, creatorId);
  }

  @Post('bulk')
  @RequirePermissions('catalog:create')
  async bulkCreate(
    @Body() dto: BulkCreateVariantDTO,
    @CurrentUser('id') creatorId: string,
  ) {
    return this.variantProductsService.bulkCreate(dto, creatorId);
  }

  @Post(':id/picture')
  @RequirePermissions('catalog:update')
  @UseInterceptors(DocumentUploadInterceptor('picture'))
  async uploadPicture(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.variantProductsService.updatePicture(id, file);
  }

  @Get()
  @RequirePermissions('catalog:read')
  async findAll(@Query() query: QueryVariantProductDTO) {
    return this.variantProductsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('catalog:read')
  async findById(@Param('id') id: string) {
    return this.variantProductsService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions('catalog:update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVariantProductDTO,
  ) {
    return this.variantProductsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('catalog:delete')
  async delete(@Param('id') id: string) {
    return this.variantProductsService.delete(id);
  }

  @Post(':id/restore')
  @RequirePermissions('catalog:update')
  async restore(@Param('id') id: string) {
    return this.variantProductsService.restore(id);
  }
}
