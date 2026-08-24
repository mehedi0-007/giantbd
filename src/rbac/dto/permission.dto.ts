import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePermissionDTO {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  module!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
