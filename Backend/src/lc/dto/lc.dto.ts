import { LCStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateLCDTO {
  @IsString()
  @IsNotEmpty()
  lcNumber!: string;

  @IsString()
  @IsNotEmpty()
  buyerId!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  issueDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiryDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  shipmentDate?: Date;

  @IsOptional()
  @IsEnum(LCStatus)
  status?: LCStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class UpdateLCDTO {
  @IsOptional()
  @IsString()
  lcNumber?: string;

  @IsOptional()
  @IsString()
  buyerId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  issueDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiryDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  shipmentDate?: Date;

  @IsOptional()
  @IsEnum(LCStatus)
  status?: LCStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class QueryLCDTO {
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
  @IsEnum(LCStatus)
  status?: LCStatus;

  @IsOptional()
  @IsString()
  expiringInDays?: string | number;

  @IsOptional()
  @IsString()
  expiryDateFrom?: string;

  @IsOptional()
  @IsString()
  expiryDateTo?: string;

  @IsOptional()
  @IsString()
  shipmentDateFrom?: string;

  @IsOptional()
  @IsString()
  shipmentDateTo?: string;
}
