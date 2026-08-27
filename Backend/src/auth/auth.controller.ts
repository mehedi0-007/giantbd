import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public, CurrentUser } from '../common';
import { ChangePasswordDTO, LogInDTO, RefreshTokenDTO, VerifyOtpDTO, ResendOtpDTO } from './dto/auth.dto';
import { REFRESH_COOKIE_OPTIONS } from './utils/auth.utils';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async logIn(
    @Body() dto: LogInDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logIn(dto);

    if ('require2FA' in result && result.require2FA) {
      return result;
    }

    if ('refreshToken' in result && result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
      const { refreshToken, ...response } = result;
      return response;
    }

    return result;
  }

  @Post('verify-otp')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() dto: VerifyOtpDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyOtp(dto);

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    const { refreshToken, ...response } = result;

    return response;
  }

  @Post('resend-otp')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: ResendOtpDTO) {
    return this.authService.resendOtp(dto);
  }

  @Post('refresh')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshTokenDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refreshToken || dto.refreshToken;

    if (!token) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const result = await this.authService.refresh(token);

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    const { refreshToken, ...response } = result;
    return response;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logOut(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
    return this.authService.logOut(userId);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
    return this.authService.changePassword(userId, dto);
  }
}
