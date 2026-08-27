import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDTO, LogInDTO, VerifyOtpDTO, ResendOtpDTO } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { AuthenticatedUser } from './utils/auth.utils';
import { MailService } from '../mail/mail.service';

type Tokenbundle = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async logIn(dto: LogInDTO) {
    const user = await this.prismaService.user.findUnique({
      where: { email: dto.email },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials provided');
    }

    const passCmp = await bcrypt.compare(dto.password, user.password);

    if (!passCmp) {
      throw new UnauthorizedException('Invalid credentials provided');
    }

    // Check if 2FA is required for this user (either user toggle or role policy)
    const requires2FA = user.isTwoFactorEnabled || Boolean(user.role?.isTwoFactorRequired);

    if (requires2FA) {
      // Generate secure 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          otpHash,
          otpExpiresAt,
          otpAttempts: 0,
        },
      });

      // Send OTP via Email / Console Logger
      this.mailService.sendLoginOtp(user.email, otp, user.name);

      // Issue temporary 5-minute token for OTP verification
      const tempToken = await this.jwtService.signAsync(
        { sub: user.id, type: '2FA_PENDING' },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET') || 'jwt-secret',
          expiresIn: '5m',
        },
      );

      return {
        require2FA: true,
        tempToken,
        email: this.maskEmail(user.email),
        message: 'A 6-digit verification code has been sent to your email.',
      };
    }

    const tokens = await this.generateTokens(user.id);
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { refreshHash },
    });

    return {
      user: AuthenticatedUser(user),
      ...tokens,
    };
  }

  async verifyOtp(dto: VerifyOtpDTO) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(dto.tempToken, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET') || 'jwt-secret',
      });
    } catch {
      throw new UnauthorizedException('2FA verification session expired. Please log in again.');
    }

    if (payload?.type !== '2FA_PENDING' || !payload?.sub) {
      throw new UnauthorizedException('Invalid 2FA session token.');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive or not found.');
    }

    if (!user.otpHash || !user.otpExpiresAt) {
      throw new BadRequestException('No pending verification code found. Please request a new code.');
    }

    if (new Date() > new Date(user.otpExpiresAt)) {
      throw new BadRequestException('Verification code has expired. Please request a new code.');
    }

    if (user.otpAttempts >= 3) {
      await this.prismaService.user.update({
        where: { id: user.id },
        data: { otpHash: null, otpExpiresAt: null, otpAttempts: 0 },
      });
      throw new BadRequestException('Too many invalid attempts. Please request a new verification code.');
    }

    const isMatch = await bcrypt.compare(dto.otp.trim(), user.otpHash);
    if (!isMatch) {
      const nextAttempts = user.otpAttempts + 1;
      await this.prismaService.user.update({
        where: { id: user.id },
        data: { otpAttempts: nextAttempts },
      });
      const remaining = 3 - nextAttempts;
      throw new BadRequestException(
        remaining > 0
          ? `Invalid verification code. ${remaining} attempt(s) remaining.`
          : 'Too many invalid attempts. Please request a new verification code.',
      );
    }

    // OTP Verified Successfully! Clear OTP state and issue real JWT tokens
    const tokens = await this.generateTokens(user.id);
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        refreshHash,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });

    return {
      user: AuthenticatedUser(user),
      ...tokens,
    };
  }

  async resendOtp(dto: ResendOtpDTO) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(dto.tempToken, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET') || 'jwt-secret',
      });
    } catch {
      throw new UnauthorizedException('2FA session expired. Please log in again.');
    }

    if (payload?.type !== '2FA_PENDING' || !payload?.sub) {
      throw new UnauthorizedException('Invalid 2FA session token.');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not active or found.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
      },
    });

    this.mailService.sendLoginOtp(user.email, otp, user.name);

    return {
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
    };
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    if (!domain) return email;
    const maskedName =
      name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
    return `${maskedName}@${domain}`;
  }

  async refresh(refreshToken: string): Promise<any> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE' || !user.refreshHash) {
      throw new UnauthorizedException('Invalid token or User not active');
    }

    const isVal = await bcrypt.compare(refreshToken, user.refreshHash);

    if (!isVal) {
      throw new UnauthorizedException('Invalid token or user not active');
    }

    const tokens = await this.generateTokens(user.id);
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { refreshHash },
    });

    return {
      user: AuthenticatedUser(user),
      ...tokens,
    };
  }

  async logOut(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prismaService.user.update({
      where: { id: userId },
      data: { refreshHash: null },
    });

    return {
      message: 'Logged out successfully',
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDTO) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(
      dto.oldPassword,
      user.password,
    );

    if (!isOldPasswordValid) {
      throw new BadRequestException('Password does not match');
    }

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const newHashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        password: newHashedPassword,
        refreshHash: null,
      },
    });

    return {
      message: 'Password changed successfully. Please log in with your new password.',
    };
  }

  private async verifyRefreshToken(token: string) {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
      });
    } catch {
      throw new UnauthorizedException('Invalid token provided');
    }
  }

  private async generateTokens(userId: string): Promise<Tokenbundle> {
    const accessToken = await this.jwtService.signAsync({
      sub: userId,
    });
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: userId,
      },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
        expiresIn:
          this.configService.get<StringValue>('JWT_REFRESH_EXPIRE') ?? '30d',
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }
}
