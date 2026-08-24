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
import { BuyersService } from './buyers.service';
import { CreateBuyerDTO, UpdateBuyerDTO } from './dto/buyer.dto';
import { PaginationQueryDTO, PermissionsGuard, RequirePermissions } from '../common';

@Controller('buyers')
@UseGuards(PermissionsGuard)
export class BuyersController {
  constructor(private readonly buyersService: BuyersService) {}

  @Post()
  @RequirePermissions('commercial:create')
  async create(@Body() dto: CreateBuyerDTO) {
    return this.buyersService.create(dto);
  }

  @Get()
  @RequirePermissions('commercial:read')
  async findAll(@Query() query: PaginationQueryDTO) {
    return this.buyersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('commercial:read')
  async findById(@Param('id') id: string) {
    return this.buyersService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions('commercial:update')
  async update(@Param('id') id: string, @Body() dto: UpdateBuyerDTO) {
    return this.buyersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('commercial:delete')
  async delete(@Param('id') id: string) {
    return this.buyersService.delete(id);
  }
}
