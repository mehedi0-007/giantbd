import { Status } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDTO } from '../../common';

export class CreateMasterProductDTO {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  subCategoryId!: string;

  @IsString()
  @IsNotEmpty()
  materialId!: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class UpdateMasterProductDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @IsOptional()
  @IsString()
  materialId?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class QueryMasterProductDTO extends PaginationQueryDTO {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @IsOptional()
  @IsString()
  materialId?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
