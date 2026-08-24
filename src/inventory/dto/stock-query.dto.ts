import { InventoryMovementType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDTO } from '../../common';

export class QueryBatchesDTO extends PaginationQueryDTO {
  @IsOptional()
  @IsString()
  poId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  productionDateFrom?: string;

  @IsOptional()
  @IsString()
  productionDateTo?: string;

  @IsOptional()
  @IsString()
  expirationDateFrom?: string;

  @IsOptional()
  @IsString()
  expirationDateTo?: string;
}

export class QueryStockDTO extends PaginationQueryDTO {
  @IsOptional()
  @IsString()
  masterProductId?: string;

  @IsOptional()
  @IsString()
  variantProductId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsString()
  subZoneId?: string;

  @IsOptional()
  @IsString()
  rackId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;
}

export class QueryMovementsDTO extends PaginationQueryDTO {
  @IsOptional()
  @IsEnum(InventoryMovementType)
  type?: InventoryMovementType;

  @IsOptional()
  @IsString()
  inventoryBatchItemId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}
