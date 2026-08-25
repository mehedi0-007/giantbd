import { StockOutStatus, StockOutType } from '@prisma/client';
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

export class StockOutItemInputDTO {
  @IsString()
  @IsNotEmpty()
  batchItemId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  issueQty!: number;
}

export class ExecuteStockOutDTO {
  @IsOptional()
  @IsString()
  poId?: string;

  @IsOptional()
  @IsString()
  buyerId?: string;

  @IsOptional()
  @IsEnum(StockOutType)
  type?: StockOutType;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dispatchDate?: Date;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockOutItemInputDTO)
  items!: StockOutItemInputDTO[];
}

export class QueryStockOutDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  per_page?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  poId?: string;

  @IsOptional()
  @IsString()
  buyerId?: string;

  @IsOptional()
  @IsEnum(StockOutType)
  type?: StockOutType;

  @IsOptional()
  @IsEnum(StockOutStatus)
  status?: StockOutStatus;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}

export class UpdateStockOutStatusDTO {
  @IsEnum(StockOutStatus)
  status!: StockOutStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CancelStockOutDTO {
  @IsOptional()
  @IsString()
  note?: string;
}
