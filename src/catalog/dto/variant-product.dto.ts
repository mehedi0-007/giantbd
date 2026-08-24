import {
  PackingType,
  PRODUCT_GENDER,
  Status,
  UnitOfMeasurement,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationQueryDTO } from '../../common';

export class CreateVariantProductDTO {
  @IsString()
  @IsNotEmpty()
  masterProductId!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsString()
  @IsNotEmpty()
  size!: string;

  @IsString()
  @IsNotEmpty()
  colorId!: string;

  @IsEnum(PRODUCT_GENDER)
  gender!: PRODUCT_GENDER;

  @IsEnum(UnitOfMeasurement)
  uom!: UnitOfMeasurement;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  itemsPerPacket!: number;

  @IsOptional()
  @IsEnum(PackingType)
  packingType?: PackingType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mrp?: number;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class BulkCreateVariantDTO {
  @IsString()
  @IsNotEmpty()
  masterProductId!: string;

  @IsArray()
  @IsString({ each: true })
  colorIds!: string[];

  @IsArray()
  @IsString({ each: true })
  sizes!: string[];

  @IsEnum(PRODUCT_GENDER)
  gender!: PRODUCT_GENDER;

  @IsEnum(UnitOfMeasurement)
  uom!: UnitOfMeasurement;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  itemsPerPacket!: number;

  @IsOptional()
  @IsEnum(PackingType)
  packingType?: PackingType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mrp?: number;
}

export class UpdateVariantProductDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  colorId?: string;

  @IsOptional()
  @IsEnum(PRODUCT_GENDER)
  gender?: PRODUCT_GENDER;

  @IsOptional()
  @IsEnum(UnitOfMeasurement)
  uom?: UnitOfMeasurement;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  itemsPerPacket?: number;

  @IsOptional()
  @IsEnum(PackingType)
  packingType?: PackingType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mrp?: number;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class QueryVariantProductDTO extends PaginationQueryDTO {
  @IsOptional()
  @IsString()
  masterProductId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @IsOptional()
  @IsString()
  colorId?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsEnum(PRODUCT_GENDER)
  gender?: PRODUCT_GENDER;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
