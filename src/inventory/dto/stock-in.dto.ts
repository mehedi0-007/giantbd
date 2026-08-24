import { PRODUCT_GENDER } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PreviewStockInDTO {
  @IsString()
  @IsNotEmpty()
  masterProductId!: string;

  @IsString()
  @IsNotEmpty()
  colorId!: string;

  @IsEnum(PRODUCT_GENDER)
  gender!: PRODUCT_GENDER;
}

export class StockInItemDTO {
  @IsString()
  @IsNotEmpty()
  variantProductId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  packetCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  itemsPerPacket?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  receivedQty?: number;

  @IsOptional()
  @IsString()
  locationId?: string;
}

export class StockInDTO {
  @IsOptional()
  @IsString()
  batch_id?: string;

  @IsOptional()
  @IsString()
  batch_number?: string;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  productionDate!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expirationDate?: Date;

  @IsOptional()
  @IsString()
  poId?: string;

  @IsOptional()
  @IsString()
  defaultLocationId?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockInItemDTO)
  items!: StockInItemDTO[];
}
