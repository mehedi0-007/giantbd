import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LogInDTO {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshTokenDTO {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class ChangePasswordDTO {
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}

export class VerifyOtpDTO {
  @IsString()
  @IsNotEmpty()
  tempToken!: string;

  @IsString()
  @IsNotEmpty()
  otp!: string;
}

export class ResendOtpDTO {
  @IsString()
  @IsNotEmpty()
  tempToken!: string;
}
