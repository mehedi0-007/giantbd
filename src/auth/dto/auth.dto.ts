import { Gender } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { generate } from 'rxjs';

export class LogInDTO {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RegistrationDTO {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsString()
  roleId!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
