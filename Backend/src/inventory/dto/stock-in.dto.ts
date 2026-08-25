import { PRODUCT_GENDER } from '@prisma/client';
import { Transform, Type, plainToInstance } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
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
  @IsOptional()
  @IsString()
  variantProductId?: string;

  @ValidateIf((o) => !o.variantProductId)
  @IsString()
  @IsNotEmpty({
    message: 'Either variantProductId or size must be specified for each item',
  })
  size?: string;

  @IsOptional()
  @IsEnum(PRODUCT_GENDER)
  gender?: PRODUCT_GENDER;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  receivedQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  quantity?: number; // Alias for receivedQty for frontend flexibility

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
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  rackId?: string;
}

export class StockInDTO {
  @IsOptional()
  @IsString()
  masterProductId?: string;

  @IsOptional()
  @IsString()
  colorId?: string;

  @IsOptional()
  @IsEnum(PRODUCT_GENDER)
  gender?: PRODUCT_GENDER;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  itemsPerPacket?: number;

  @IsOptional()
  @IsString()
  batch_id?: string;

  @IsOptional()
  @IsString()
  batch_number?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  stockInDate?: Date;

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

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? parsed.map((item) => plainToInstance(StockInItemDTO, item))
          : parsed;
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockInItemDTO)
  items!: StockInItemDTO[];
}

