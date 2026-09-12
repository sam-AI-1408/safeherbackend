import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService, AuthTokens } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
import { Public, CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Authentication & Identity')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Student onboarding registration' })
  @ApiResponse({ status: 201, description: 'Student registered successfully and tokens issued' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Elevated administrative roles cannot self-register' })
  @ApiResponse({ status: 409, description: 'Account with this email already exists' })
  async register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthTokens> {
    const clientIp = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.register(dto, clientIp, userAgent);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthTokens> {
    const clientIp = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(dto, clientIp, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token pair' })
  @ApiResponse({ status: 200, description: 'Token pair successfully rotated' })
  @ApiResponse({ status: 401, description: 'Invalid or revoked refresh token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<AuthTokens> {
    const clientIp = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.refreshToken(dto, clientIp, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke active user sessions and logout' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(
    @CurrentUser('userId') userId: string,
    @Body() body: Partial<RefreshTokenDto>,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const clientIp = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.logout(userId, body.refreshToken, clientIp, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile and permissions' })
  @ApiResponse({ status: 200, description: 'Current user profile returned' })
  async getProfile(@CurrentUser('userId') userId: string) {
    return this.authService.getProfile(userId);
  }
}
