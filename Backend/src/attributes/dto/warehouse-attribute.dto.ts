import { Status } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDTO } from '../../common';

export class CreateWarehouseDTO {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateWarehouseDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class CreateZoneDTO {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateZoneDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class CreateSubZoneDTO {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  zoneId!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSubZoneDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class CreateRackDTO {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  subZoneId!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateBulkRacksDTO {
  @IsString()
  @IsNotEmpty()
  subZoneId!: string;

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsString()
  codePrefix?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  count!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  startIndex?: number;
}

export class UpdateRackDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  subZoneId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class QueryLocationDTO extends PaginationQueryDTO {
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
  @IsEnum(Status)
  status?: Status;
}
