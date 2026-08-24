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
import { CategoriesService } from '../services/categories.service';
import {
  CreateCategoryDTO,
  CreateSubCategoryDTO,
  UpdateCategoryDTO,
  UpdateSubCategoryDTO,
} from '../dto/category.dto';
import { PaginationQueryDTO, PermissionsGuard, RequirePermissions } from '../../common';

@Controller('categories')
@UseGuards(PermissionsGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @RequirePermissions('catalog:create')
  async createCategory(@Body() dto: CreateCategoryDTO) {
    return this.categoriesService.createCategory(dto);
  }

  @Get()
  @RequirePermissions('catalog:read')
  async findAllCategories(@Query() query: PaginationQueryDTO) {
    return this.categoriesService.findAllCategories(query);
  }

  @Get(':id')
  @RequirePermissions('catalog:read')
  async findCategoryById(@Param('id') id: string) {
    return this.categoriesService.findCategoryById(id);
  }

  @Patch(':id')
  @RequirePermissions('catalog:update')
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDTO) {
    return this.categoriesService.updateCategory(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('catalog:delete')
  async deleteCategory(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(id);
  }

  @Post('subcategories')
  @RequirePermissions('catalog:create')
  async createSubCategory(@Body() dto: CreateSubCategoryDTO) {
    return this.categoriesService.createSubCategory(dto);
  }

  @Get(':id/subcategories')
  @RequirePermissions('catalog:read')
  async findSubCategoriesByCategory(@Param('id') id: string) {
    return this.categoriesService.findSubCategoriesByCategory(id);
  }

  @Patch('subcategories/:id')
  @RequirePermissions('catalog:update')
  async updateSubCategory(
    @Param('id') id: string,
    @Body() dto: UpdateSubCategoryDTO,
  ) {
    return this.categoriesService.updateSubCategory(id, dto);
  }

  @Delete('subcategories/:id')
  @RequirePermissions('catalog:delete')
  async deleteSubCategory(@Param('id') id: string) {
    return this.categoriesService.deleteSubCategory(id);
  }
}
