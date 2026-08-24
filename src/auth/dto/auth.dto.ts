import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LogInDTO {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshTokenDTO {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}