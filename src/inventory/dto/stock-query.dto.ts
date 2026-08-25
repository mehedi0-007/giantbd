import { InventoryMovementType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
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

export class UpdateBatchDTO {
  @IsOptional()
  @IsString()
  batch_number?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  productionDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expirationDate?: Date;

  @IsOptional()
  @IsString()
  poId?: string;
}

export class UpdateBatchItemDTO {
  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  rackId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  receivedQty?: number;

  @IsOptional()
  @IsString()
  colorId?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  itemsPerPacket?: number;

  @IsOptional()
  @IsString()
  note?: string;
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
