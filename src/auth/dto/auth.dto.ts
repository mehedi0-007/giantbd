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