import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDTO } from './dto/permission.dto';
import { PermissionsGuard, RequirePermissions } from '../common';

@Controller('permissions')
@UseGuards(PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('roles:read')
  async findAll(@Query('grouped') grouped?: string) {
    const isGrouped = grouped === 'true' || grouped === '1';
    return this.permissionsService.findAll(isGrouped);
  }

  @Post()
  @RequirePermissions('roles:update')
  async create(@Body() dto: CreatePermissionDTO) {
    return this.permissionsService.create(dto);
  }

  @Post('seed')
  @RequirePermissions('roles:update')
  async seed() {
    return this.permissionsService.seedDefaultPermissions();
  }
}
