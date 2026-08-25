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
import { LCService } from './lc.service';
import { CreateLCDTO, QueryLCDTO, UpdateLCDTO } from './dto/lc.dto';
import { PermissionsGuard, RequirePermissions } from '../common';

@Controller('lc')
@UseGuards(PermissionsGuard)
export class LCController {
  constructor(private readonly lcService: LCService) {}

  @Post()
  @RequirePermissions('commercial:create')
  async create(@Body() dto: CreateLCDTO) {
    return this.lcService.create(dto);
  }

  @Get()
  @RequirePermissions('commercial:read')
  async findAll(@Query() query: QueryLCDTO) {
    return this.lcService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('commercial:read')
  async findById(@Param('id') id: string) {
    return this.lcService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions('commercial:update')
  async update(@Param('id') id: string, @Body() dto: UpdateLCDTO) {
    return this.lcService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('commercial:delete')
  async delete(@Param('id') id: string) {
    return this.lcService.delete(id);
  }

  @Post(':id/restore')
  @RequirePermissions('commercial:update')
  async restore(@Param('id') id: string) {
    return this.lcService.restore(id);
  }
}
