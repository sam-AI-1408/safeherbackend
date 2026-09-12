import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto, LoginDto, RefreshTokenDto, UpdateProfileDto, ChangePasswordDto, ChangeEmailDto } from './dto';
import { Role, UserStatus } from '../common/enums';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    departmentId?: string;
  };
}

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto, clientIp?: string, userAgent?: string): Promise<AuthTokens> {
    // 1. Prevent public registration with elevated administrative or officer roles
    const requestedRole = dto.role || Role.STUDENT;
    if (requestedRole !== Role.STUDENT) {
      throw new ForbiddenException(
        'Elevated administrative and officer roles (HOD, WOMEN_SAFETY_OFFICER, PRINCIPAL, ADMIN) cannot be self-registered. They must be provisioned by System Administration.',
      );
    }

    // 2. Check if user with email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    // 3. Hash password securely
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    // 4. Create user record
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        name: dto.name.trim(),
        phone: dto.phone?.trim(),
        passwordHash,
        role: Role.STUDENT,
        departmentId: dto.departmentId,
        status: UserStatus.ACTIVE,
      },
    });

    // 5. Generate tokens and session
    const tokens = await this.generateTokensAndSession(user, dto.name, clientIp, userAgent);

    // 6. Audit log registration
    await this.auditService.log({
      actorUserId: user.id,
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: user.id,
      ipAddress: clientIp,
      userAgent,
      metadata: { email: user.email, role: user.role },
    });

    return tokens;
  }

  async login(dto: LoginDto, clientIp?: string, userAgent?: string): Promise<AuthTokens> {
    const email = dto.email.toLowerCase().trim();

    // 1. Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 2. Check account status
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('This account has been suspended by institution administration');
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.auditService.log({
        actorUserId: user.id,
        action: 'USER_LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        ipAddress: clientIp,
        userAgent,
        metadata: { reason: 'INVALID_CREDENTIALS' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    // 4. Generate tokens and session
    const tokens = await this.generateTokensAndSession(user, dto.deviceInfo, clientIp, userAgent);

    // 5. Record successful login audit log
    await this.auditService.log({
      actorUserId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      ipAddress: clientIp,
      userAgent,
      metadata: { role: user.role, deviceInfo: dto.deviceInfo },
    });

    return tokens;
  }

  async refreshToken(dto: RefreshTokenDto, clientIp?: string, userAgent?: string): Promise<AuthTokens> {
    try {
      // 1. Verify token signature
      const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || 'safeher_fallback_refresh_key_2026';
      const decoded = this.jwtService.verify(dto.refreshToken, { secret: refreshSecret });

      // 2. Hash refresh token to locate session in DB
      const sessions = await this.prisma.session.findMany({
        where: {
          userId: decoded.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      // Find matching session
      let matchingSession = null;
      for (const session of sessions) {
        const isMatch = await bcrypt.compare(dto.refreshToken, session.refreshTokenHash);
        if (isMatch) {
          matchingSession = session;
          break;
        }
      }

      if (!matchingSession) {
        throw new UnauthorizedException('Refresh token is invalid or has been revoked');
      }

      // 3. Revoke old session (Rotation)
      await this.prisma.session.update({
        where: { id: matchingSession.id },
        data: { revokedAt: new Date() },
      });

      // 4. Generate new token pair and session
      const user = matchingSession.user;
      if (user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('Account suspended');
      }

      const tokens = await this.generateTokensAndSession(user, matchingSession.deviceInfo, clientIp, userAgent);

      await this.auditService.log({
        actorUserId: user.id,
        action: 'TOKEN_ROTATED',
        entityType: 'Session',
        entityId: matchingSession.id,
        ipAddress: clientIp,
        userAgent,
      });

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string, clientIp?: string, userAgent?: string): Promise<{ message: string }> {
    if (refreshToken) {
      const sessions = await this.prisma.session.findMany({
        where: { userId, revokedAt: null },
      });

      for (const session of sessions) {
        const isMatch = await bcrypt.compare(refreshToken, session.refreshTokenHash);
        if (isMatch) {
          await this.prisma.session.update({
            where: { id: session.id },
            data: { revokedAt: new Date() },
          });
          break;
        }
      }
    } else {
      // Revoke all active sessions for this user on full logout
      await this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.auditService.log({
      actorUserId: userId,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: userId,
      ipAddress: clientIp,
      userAgent,
    });

    return { message: 'Successfully logged out and session revoked' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        departmentId: true,
        department: {
          select: { id: true, name: true, code: true },
        },
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User profile not found');
    }

    return user;
  }

  private async generateTokensAndSession(
    user: { id: string; email: string; name: string; role: any; departmentId?: string },
    deviceInfo?: string,
    clientIp?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId || undefined,
    };

    const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'safeher_fallback_secret_key_2026';
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || 'safeher_fallback_refresh_key_2026';

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: '7d',
    });

    // Hash refresh token before persisting into database
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        deviceInfo: deviceInfo || userAgent || 'Unknown Client',
        ipAddress: clientIp,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId || undefined,
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, clientIp?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.phone ? { phone: dto.phone.trim() } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        department: true,
        createdAt: true,
      },
    });

    await this.auditService.log({
      actorUserId: userId,
      action: 'PROFILE_UPDATED',
      entityType: 'User',
      entityId: userId,
      ipAddress: clientIp,
      metadata: { name: dto.name, phone: dto.phone },
    });

    return updated;
  }

  async changePassword(userId: string, dto: ChangePasswordDto, clientIp?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, this.saltRounds);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      }),
      this.prisma.session.deleteMany({
        where: { userId },
      }),
    ]);

    await this.auditService.log({
      actorUserId: userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: userId,
      ipAddress: clientIp,
    });

    return { message: 'Password changed successfully. Please log in again with your new password.' };
  }

  async changeEmail(userId: string, dto: ChangeEmailDto, clientIp?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const targetEmail = dto.newEmail.toLowerCase().trim();
    if (targetEmail === user.email.toLowerCase()) {
      throw new BadRequestException('New email cannot be identical to current email');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: targetEmail },
    });
    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { email: targetEmail },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    await this.auditService.log({
      actorUserId: userId,
      action: 'EMAIL_CHANGED',
      entityType: 'User',
      entityId: userId,
      ipAddress: clientIp,
      metadata: { oldEmail: user.email, newEmail: targetEmail },
    });

    return {
      message: 'Email address updated successfully.',
      user: updated,
    };
  }
}
