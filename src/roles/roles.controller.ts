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
import { RolesService } from './roles.service';
import { CreateRoleDTO, UpdateRoleDTO } from './dto/role.dto';
import { PermissionsGuard, RequirePermissions } from '../common';

@Controller('roles')
@UseGuards(PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions('roles:create')
  async create(@Body() dto: CreateRoleDTO) {
    return this.rolesService.create(dto);
  }

  @Get()
  @RequirePermissions('roles:read')
  async findAll(
    @Query('page') page?: number,
    @Query('per_page') per_page?: number,
    @Query('search') search?: string,
  ) {
    return this.rolesService.findAll({ page, per_page, search });
  }

  @Get(':id')
  @RequirePermissions('roles:read')
  async findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions('roles:update')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDTO) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('roles:delete')
  async delete(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }

  @Post(':id/restore')
  @RequirePermissions('roles:update')
  async restore(@Param('id') id: string) {
    return this.rolesService.restore(id);
  }
}
