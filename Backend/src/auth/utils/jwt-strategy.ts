import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from './auth.utils';

type jwtPayload = {
  sub: string;
};

interface CachedUserEntry {
  user: any;
  expiresAt: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // Short-lived in-memory cache (60s) to prevent DB saturation on high RPS
  private readonly userCache = new Map<string, CachedUserEntry>();
  private readonly CACHE_TTL_MS = 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: jwtPayload): Promise<any> {
    const now = Date.now();
    const cached = this.userCache.get(payload.sub);

    if (cached && cached.expiresAt > now) {
      return cached.user;
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
      this.userCache.delete(payload.sub);
      throw new UnauthorizedException('Token invalid or User not active');
    }

    const authUser = AuthenticatedUser(user);
    this.userCache.set(payload.sub, {
      user: authUser,
      expiresAt: now + this.CACHE_TTL_MS,
    });

    // Cleanup old cache entries periodically
    if (this.userCache.size > 1000) {
      for (const [key, entry] of this.userCache.entries()) {
        if (entry.expiresAt <= now) {
          this.userCache.delete(key);
        }
      }
    }

    return authUser;
  }
}
