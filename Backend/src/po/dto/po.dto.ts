import { POStatus } from '@prisma/client';
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

export class POItemInputDTO {
  @IsString()
  @IsNotEmpty()
  variantProductId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreatePODTO {
  @IsString()
  @IsNotEmpty()
  poNumber!: string;

  @IsString()
  @IsNotEmpty()
  lcId!: string;

  @IsOptional()
  @IsString()
  buyerId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  orderDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deliveryDate?: Date;

  @IsOptional()
  @IsEnum(POStatus)
  status?: POStatus;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POItemInputDTO)
  items?: POItemInputDTO[];
}

export class UpdatePODTO {
  @IsOptional()
  @IsString()
  poNumber?: string;

  @IsOptional()
  @IsString()
  buyerId?: string;

  @IsOptional()
  @IsString()
  lcId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  orderDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deliveryDate?: Date;

  @IsOptional()
  @IsEnum(POStatus)
  status?: POStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class AddPOItemsDTO {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POItemInputDTO)
  items!: POItemInputDTO[];
}

export class QueryPODTO {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  page?: string | number;

  @IsOptional()
  @IsString()
  per_page?: string | number;

  @IsOptional()
  @IsString()
  buyerId?: string;

  @IsOptional()
  @IsString()
  lcId?: string;

  @IsOptional()
  @IsEnum(POStatus)
  status?: POStatus;

  @IsOptional()
  @IsString()
  orderDateFrom?: string;

  @IsOptional()
  @IsString()
  orderDateTo?: string;

  @IsOptional()
  @IsString()
  deliveryDateFrom?: string;

  @IsOptional()
  @IsString()
  deliveryDateTo?: string;
}
