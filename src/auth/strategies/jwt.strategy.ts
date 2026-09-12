import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, UserStatus } from '../../common/enums';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  departmentId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'safeher_fallback_secret_key_2026',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        departmentId: true,
        status: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('User account has been suspended by institution administration');
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      departmentId: user.departmentId || undefined,
    };
  }
}
