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

export class ChangePasswordDTO {
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}
