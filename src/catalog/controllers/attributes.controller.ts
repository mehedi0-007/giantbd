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
import { AttributesService } from '../services/attributes.service';
import {
  CreateColorDTO,
  CreateMaterialDTO,
  UpdateColorDTO,
  UpdateMaterialDTO,
} from '../dto/attribute.dto';
import { PaginationQueryDTO, PermissionsGuard, RequirePermissions } from '../../common';

@Controller()
@UseGuards(PermissionsGuard)
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Post('colors')
  @RequirePermissions('catalog:create')
  async createColor(@Body() dto: CreateColorDTO) {
    return this.attributesService.createColor(dto);
  }

  @Get('colors')
  @RequirePermissions('catalog:read')
  async findAllColors(@Query() query: PaginationQueryDTO) {
    return this.attributesService.findAllColors(query);
  }

  @Get('colors/:id')
  @RequirePermissions('catalog:read')
  async findColorById(@Param('id') id: string) {
    return this.attributesService.findColorById(id);
  }

  @Patch('colors/:id')
  @RequirePermissions('catalog:update')
  async updateColor(@Param('id') id: string, @Body() dto: UpdateColorDTO) {
    return this.attributesService.updateColor(id, dto);
  }

  @Delete('colors/:id')
  @RequirePermissions('catalog:delete')
  async deleteColor(@Param('id') id: string) {
    return this.attributesService.deleteColor(id);
  }

  @Post('materials')
  @RequirePermissions('catalog:create')
  async createMaterial(@Body() dto: CreateMaterialDTO) {
    return this.attributesService.createMaterial(dto);
  }

  @Get('materials')
  @RequirePermissions('catalog:read')
  async findAllMaterials(@Query() query: PaginationQueryDTO) {
    return this.attributesService.findAllMaterials(query);
  }

  @Get('materials/:id')
  @RequirePermissions('catalog:read')
  async findMaterialById(@Param('id') id: string) {
    return this.attributesService.findMaterialById(id);
  }

  @Patch('materials/:id')
  @RequirePermissions('catalog:update')
  async updateMaterial(@Param('id') id: string, @Body() dto: UpdateMaterialDTO) {
    return this.attributesService.updateMaterial(id, dto);
  }

  @Delete('materials/:id')
  @RequirePermissions('catalog:delete')
  async deleteMaterial(@Param('id') id: string) {
    return this.attributesService.deleteMaterial(id);
  }
}
