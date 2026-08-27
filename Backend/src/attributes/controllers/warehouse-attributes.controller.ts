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
import { WarehouseAttributesService } from '../services/warehouse-attributes.service';
import {
  CreateBulkRacksDTO,
  CreateRackDTO,
  CreateSubZoneDTO,
  CreateWarehouseDTO,
  CreateZoneDTO,
  QueryLocationDTO,
  UpdateRackDTO,
  UpdateSubZoneDTO,
  UpdateWarehouseDTO,
  UpdateZoneDTO,
} from '../dto/warehouse-attribute.dto';
import { PaginationQueryDTO, PermissionsGuard, RequirePermissions } from '../../common';

@Controller('attributes')
@UseGuards(PermissionsGuard)
export class WarehouseAttributesController {
  constructor(
    private readonly warehouseAttributesService: WarehouseAttributesService,
  ) {}

  @Post('warehouses')
  @RequirePermissions('warehouse:create')
  async createWarehouse(@Body() dto: CreateWarehouseDTO) {
    return this.warehouseAttributesService.createWarehouse(dto);
  }

  @Get('warehouses')
  @RequirePermissions('warehouse:read')
  async findAllWarehouses(@Query() query: PaginationQueryDTO) {
    return this.warehouseAttributesService.findAllWarehouses(query);
  }

  @Get('warehouses/:id')
  @RequirePermissions('warehouse:read')
  async findWarehouseById(@Param('id') id: string) {
    return this.warehouseAttributesService.findWarehouseById(id);
  }

  @Patch('warehouses/:id')
  @RequirePermissions('warehouse:update')
  async updateWarehouse(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDTO,
  ) {
    return this.warehouseAttributesService.updateWarehouse(id, dto);
  }

  @Delete('warehouses/:id')
  @RequirePermissions('warehouse:delete')
  async deleteWarehouse(@Param('id') id: string) {
    return this.warehouseAttributesService.deleteWarehouse(id);
  }

  @Post('zones')
  @RequirePermissions('warehouse:create')
  async createZone(@Body() dto: CreateZoneDTO) {
    return this.warehouseAttributesService.createZone(dto);
  }

  @Get('zones')
  @RequirePermissions('warehouse:read')
  async findAllZones(@Query() query: PaginationQueryDTO) {
    return this.warehouseAttributesService.findAllZones(query);
  }

  @Get('zones/:id')
  @RequirePermissions('warehouse:read')
  async findZoneById(@Param('id') id: string) {
    return this.warehouseAttributesService.findZoneById(id);
  }

  @Patch('zones/:id')
  @RequirePermissions('warehouse:update')
  async updateZone(@Param('id') id: string, @Body() dto: UpdateZoneDTO) {
    return this.warehouseAttributesService.updateZone(id, dto);
  }

  @Delete('zones/:id')
  @RequirePermissions('warehouse:delete')
  async deleteZone(@Param('id') id: string) {
    return this.warehouseAttributesService.deleteZone(id);
  }

  @Post('subzones')
  @RequirePermissions('warehouse:create')
  async createSubZone(@Body() dto: CreateSubZoneDTO) {
    return this.warehouseAttributesService.createSubZone(dto);
  }

  @Get('subzones')
  @RequirePermissions('warehouse:read')
  async findAllSubZones(@Query() query: PaginationQueryDTO) {
    return this.warehouseAttributesService.findAllSubZones(query);
  }

  @Get('subzones/:id')
  @RequirePermissions('warehouse:read')
  async findSubZoneById(@Param('id') id: string) {
    return this.warehouseAttributesService.findSubZoneById(id);
  }

  @Patch('subzones/:id')
  @RequirePermissions('warehouse:update')
  async updateSubZone(
    @Param('id') id: string,
    @Body() dto: UpdateSubZoneDTO,
  ) {
    return this.warehouseAttributesService.updateSubZone(id, dto);
  }

  @Delete('subzones/:id')
  @RequirePermissions('warehouse:delete')
  async deleteSubZone(@Param('id') id: string) {
    return this.warehouseAttributesService.deleteSubZone(id);
  }

  @Post('racks/bulk')
  @RequirePermissions('warehouse:create')
  async createBulkRacks(@Body() dto: CreateBulkRacksDTO) {
    return this.warehouseAttributesService.createBulkRacks(dto);
  }

  @Post('racks')
  @RequirePermissions('warehouse:create')
  async createRack(@Body() dto: CreateRackDTO) {
    return this.warehouseAttributesService.createRack(dto);
  }

  @Get('racks')
  @RequirePermissions('warehouse:read')
  async findAllRacks(@Query() query: PaginationQueryDTO) {
    return this.warehouseAttributesService.findAllRacks(query);
  }

  @Get('racks/:id')
  @RequirePermissions('warehouse:read')
  async findRackById(@Param('id') id: string) {
    return this.warehouseAttributesService.findRackById(id);
  }

  @Patch('racks/:id')
  @RequirePermissions('warehouse:update')
  async updateRack(@Param('id') id: string, @Body() dto: UpdateRackDTO) {
    return this.warehouseAttributesService.updateRack(id, dto);
  }

  @Delete('racks/:id')
  @RequirePermissions('warehouse:delete')
  async deleteRack(@Param('id') id: string) {
    return this.warehouseAttributesService.deleteRack(id);
  }

  @Get('locations')
  @RequirePermissions('warehouse:read')
  async findAllLocations(@Query() query: QueryLocationDTO) {
    return this.warehouseAttributesService.findAllLocations(query);
  }

  @Get('locations/barcode/:code')
  @RequirePermissions('warehouse:read')
  async findLocationByBarcode(@Param('code') code: string) {
    return this.warehouseAttributesService.findLocationByBarcode(code);
  }

  @Get('locations/:id')
  @RequirePermissions('warehouse:read')
  async findLocationById(@Param('id') id: string) {
    return this.warehouseAttributesService.findLocationById(id);
  }
}
