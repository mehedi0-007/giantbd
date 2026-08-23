import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogInDTO } from './auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { AuthenticatedUser } from './auth.utils';

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

    if (!passCmp)
      throw new UnauthorizedException('Invalid credentials provided');

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

  async refresh(refreshToken: string): Promise<any> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.prismaService.user.findUnique(payload.sub);

    if (!user || user.status !== 'ACTIVE')
      throw new UnauthorizedException('Invalid token or User not active');

    const isVal = await bcrypt.compare(refreshToken, user.refreshHash ?? '');

    if (!isVal)
      throw new UnauthorizedException('Invalid token or user not active');

    const tokens = await this.generateTokens(user.id);

    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);

    await this.prismaService.user.update({
      where: { id: payload.sub },
      data: { refreshHash },
    });

    return {
      ...tokens,
      user: AuthenticatedUser(user),
    };
  }

  private async verifyRefreshToken(token: string) {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
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
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'DEV-SECRET',
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
