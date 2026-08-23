import { IsEmail, IsString } from 'class-validator';

export class LogInDTO {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
