import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/Decorators/public.decorator';
import { CurrentUser } from '../common/Decorators/current-user.decorator';
import { LogInDTO, RefreshTokenDTO } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async logIn(@Body() dto: LogInDTO) {
    return this.authService.logIn(dto);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDTO) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logOut(@CurrentUser('id') userId: string) {
    return this.authService.logOut(userId);
  }
}

