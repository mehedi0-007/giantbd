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
import { ProductAttributesService } from '../services/product-attributes.service';
import {
  CreateCategoryDTO,
  CreateSubCategoryDTO,
  UpdateCategoryDTO,
  UpdateSubCategoryDTO,
} from '../dto/category-attribute.dto';
import {
  CreateColorDTO,
  CreateMaterialDTO,
  UpdateColorDTO,
  UpdateMaterialDTO,
} from '../dto/product-attribute.dto';
import { PaginationQueryDTO, PermissionsGuard, RequirePermissions } from '../../common';

@Controller('attributes')
@UseGuards(PermissionsGuard)
export class ProductAttributesController {
  constructor(
    private readonly productAttributesService: ProductAttributesService,
  ) {}

  @Post('categories')
  @RequirePermissions('catalog:create')
  async createCategory(@Body() dto: CreateCategoryDTO) {
    return this.productAttributesService.createCategory(dto);
  }

  @Get('categories')
  @RequirePermissions('catalog:read')
  async findAllCategories(@Query() query: PaginationQueryDTO) {
    return this.productAttributesService.findAllCategories(query);
  }

  @Get('categories/:id')
  @RequirePermissions('catalog:read')
  async findCategoryById(@Param('id') id: string) {
    return this.productAttributesService.findCategoryById(id);
  }

  @Patch('categories/:id')
  @RequirePermissions('catalog:update')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDTO,
  ) {
    return this.productAttributesService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @RequirePermissions('catalog:delete')
  async deleteCategory(@Param('id') id: string) {
    return this.productAttributesService.deleteCategory(id);
  }

  @Post('subcategories')
  @RequirePermissions('catalog:create')
  async createSubCategory(@Body() dto: CreateSubCategoryDTO) {
    return this.productAttributesService.createSubCategory(dto);
  }

  @Get('subcategories')
  @RequirePermissions('catalog:read')
  async findAllSubCategories(@Query() query: PaginationQueryDTO) {
    return this.productAttributesService.findAllSubCategories(query);
  }

  @Get('subcategories/:id')
  @RequirePermissions('catalog:read')
  async findSubCategoryById(@Param('id') id: string) {
    return this.productAttributesService.findSubCategoryById(id);
  }

  @Patch('subcategories/:id')
  @RequirePermissions('catalog:update')
  async updateSubCategory(
    @Param('id') id: string,
    @Body() dto: UpdateSubCategoryDTO,
  ) {
    return this.productAttributesService.updateSubCategory(id, dto);
  }

  @Delete('subcategories/:id')
  @RequirePermissions('catalog:delete')
  async deleteSubCategory(@Param('id') id: string) {
    return this.productAttributesService.deleteSubCategory(id);
  }

  @Post('colors')
  @RequirePermissions('catalog:create')
  async createColor(@Body() dto: CreateColorDTO) {
    return this.productAttributesService.createColor(dto);
  }

  @Get('colors')
  @RequirePermissions('catalog:read')
  async findAllColors(@Query() query: PaginationQueryDTO) {
    return this.productAttributesService.findAllColors(query);
  }

  @Get('colors/:id')
  @RequirePermissions('catalog:read')
  async findColorById(@Param('id') id: string) {
    return this.productAttributesService.findColorById(id);
  }

  @Patch('colors/:id')
  @RequirePermissions('catalog:update')
  async updateColor(@Param('id') id: string, @Body() dto: UpdateColorDTO) {
    return this.productAttributesService.updateColor(id, dto);
  }

  @Delete('colors/:id')
  @RequirePermissions('catalog:delete')
  async deleteColor(@Param('id') id: string) {
    return this.productAttributesService.deleteColor(id);
  }

  @Post('materials')
  @RequirePermissions('catalog:create')
  async createMaterial(@Body() dto: CreateMaterialDTO) {
    return this.productAttributesService.createMaterial(dto);
  }

  @Get('materials')
  @RequirePermissions('catalog:read')
  async findAllMaterials(@Query() query: PaginationQueryDTO) {
    return this.productAttributesService.findAllMaterials(query);
  }

  @Get('materials/:id')
  @RequirePermissions('catalog:read')
  async findMaterialById(@Param('id') id: string) {
    return this.productAttributesService.findMaterialById(id);
  }

  @Patch('materials/:id')
  @RequirePermissions('catalog:update')
  async updateMaterial(
    @Param('id') id: string,
    @Body() dto: UpdateMaterialDTO,
  ) {
    return this.productAttributesService.updateMaterial(id, dto);
  }

  @Delete('materials/:id')
  @RequirePermissions('catalog:delete')
  async deleteMaterial(@Param('id') id: string) {
    return this.productAttributesService.deleteMaterial(id);
  }
}
