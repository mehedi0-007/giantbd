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
import { POService } from './po.service';
import { AddPOItemsDTO, CreatePODTO, QueryPODTO, UpdatePODTO } from './dto/po.dto';
import { PermissionsGuard, RequirePermissions } from '../common';

@Controller('po')
@UseGuards(PermissionsGuard)
export class POController {
  constructor(private readonly poService: POService) {}

  @Post()
  @RequirePermissions('commercial:create')
  async create(@Body() dto: CreatePODTO) {
    return this.poService.create(dto);
  }

  @Get()
  @RequirePermissions('commercial:read')
  async findAll(@Query() query: QueryPODTO) {
    return this.poService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('commercial:read')
  async findById(@Param('id') id: string) {
    return this.poService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions('commercial:update')
  async update(@Param('id') id: string, @Body() dto: UpdatePODTO) {
    return this.poService.update(id, dto);
  }

  @Post(':id/items')
  @RequirePermissions('commercial:update')
  async addOrUpdateItems(
    @Param('id') id: string,
    @Body() dto: AddPOItemsDTO,
  ) {
    return this.poService.addOrUpdateItems(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('commercial:delete')
  async delete(@Param('id') id: string) {
    return this.poService.delete(id);
  }

  @Post(':id/restore')
  @RequirePermissions('commercial:update')
  async restore(@Param('id') id: string) {
    return this.poService.restore(id);
  }
}
