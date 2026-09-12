import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role, UserStatus } from '../common/enums';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockImplementation((str: string) => Promise.resolve(`hashed_${str}`)),
  compare: jest.fn().mockImplementation((plain: string, hash: string) => Promise.resolve(plain === 'Password@123' || hash.includes(plain))),
}));

describe('AuthService (Stage 1 Foundation Tests & Security Verification)', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'student-uuid-123',
    email: 'student@safeher.test',
    name: 'Priya Sharma',
    passwordHash: '$2b$12$eX4mP1eH4sHkEyF0rT3st1ng0nLyS3cur1ty1234567890',
    role: Role.STUDENT,
    departmentId: 'dept-cse-123',
    status: UserStatus.ACTIVE,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test_jwt_secret';
      if (key === 'JWT_REFRESH_SECRET') return 'test_refresh_secret';
      return null;
    }),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    jest.clearAllMocks();
  });

  describe('Registration & Role Escalation Prevention', () => {
    it('1. should successfully register a student with hashed password and create session', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.user.create.mockResolvedValueOnce(mockUser);
      mockPrismaService.session.create.mockResolvedValueOnce({ id: 'session-123' });

      const result = await service.register({
        email: 'student@safeher.test',
        name: 'Priya Sharma',
        password: 'Password@123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('student@safeher.test');
      expect(result.user.role).toBe(Role.STUDENT);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_REGISTER' }),
      );
    });

    it('2. should reject registration if email already exists (ConflictException)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(
        service.register({
          email: 'student@safeher.test',
          name: 'Priya Sharma',
          password: 'Password@123',
          role: Role.STUDENT,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('3. should reject registration if client attempts to self-assign ADMIN role', async () => {
      await expect(
        service.register({
          email: 'attacker@safeher.test',
          name: 'Rogue Admin',
          password: 'Password@123',
          role: Role.ADMIN,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('4. should reject registration if client attempts to self-assign HOD role', async () => {
      await expect(
        service.register({
          email: 'rogue.hod@safeher.test',
          name: 'Rogue HOD',
          password: 'Password@123',
          role: Role.HOD,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('5. should reject registration if client attempts to self-assign PRINCIPAL role', async () => {
      await expect(
        service.register({
          email: 'rogue.principal@safeher.test',
          name: 'Rogue Principal',
          password: 'Password@123',
          role: Role.PRINCIPAL,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject registration if client attempts to self-assign WOMEN_SAFETY_OFFICER role', async () => {
      await expect(
        service.register({
          email: 'rogue.officer@safeher.test',
          name: 'Rogue Officer',
          password: 'Password@123',
          role: Role.WOMEN_SAFETY_OFFICER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Login & Credential Verification', () => {
    it('6. should successfully authenticate user with correct password and issue token pair', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      mockPrismaService.session.create.mockResolvedValueOnce({ id: 'session-123' });

      const result = await service.login({
        email: 'student@safeher.test',
        password: 'Password@123',
        deviceInfo: 'Test Device',
      });

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.role).toBe(Role.STUDENT);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_LOGIN_SUCCESS' }),
      );
    });

    it('7. should reject login with wrong password (UnauthorizedException)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.login({
          email: 'student@safeher.test',
          password: 'WrongPassword@123',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_LOGIN_FAILED' }),
      );
    });

    it('should reject login if user does not exist (UnauthorizedException)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({
          email: 'nonexistent@safeher.test',
          password: 'Password@123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login if account is suspended', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      await expect(
        service.login({
          email: 'student@safeher.test',
          password: 'Password@123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Profile & Current User (/auth/me)', () => {
    it('8. should return authenticated user profile including role', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        phone: '+919876543201',
        role: Role.STUDENT,
        departmentId: mockUser.departmentId,
        department: { id: 'dept-cse-123', name: 'Computer Science & Engineering', code: 'CSE' },
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
      });

      const profile = await service.getProfile('student-uuid-123');

      expect(profile.id).toBe(mockUser.id);
      expect(profile.email).toBe('student@safeher.test');
      expect(profile.role).toBe(Role.STUDENT);
      expect(profile.name).toBe('Priya Sharma');
    });

    it('should throw UnauthorizedException if profile not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.getProfile('missing-uuid')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Logout & Session Revocation', () => {
    it('should revoke user session upon logout and record audit log', async () => {
      mockPrismaService.session.updateMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.logout('student-uuid-123');

      expect(result.message).toContain('Successfully logged out');
      expect(mockPrismaService.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'student-uuid-123', revokedAt: null },
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_LOGOUT' }),
      );
    });
  });
});
