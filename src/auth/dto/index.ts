import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsEnum, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums';

export class RegisterDto {
  @ApiProperty({ example: 'priya.sharma@college.edu', description: 'Institutional email address' })
  @IsEmail({}, { message: 'Must provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Priya Sharma', description: 'Full name of the student' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '+919876543210', description: 'Contact phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'StrongP@ssw0rd2026', description: 'Secure password (min 8 characters with upper, lower, number)' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain uppercase letters, lowercase letters, and at least one number or symbol',
  })
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.STUDENT, description: 'Role (defaults to STUDENT for public registrations)' })
  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.STUDENT;

  @ApiPropertyOptional({ description: 'Assigned department ID if applicable' })
  @IsString()
  @IsOptional()
  departmentId?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'student@safeher.test', description: 'Registered email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Student@123', description: 'Account password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: 'Flutter Android (Pixel 7)', description: 'Device/client information for session tracking' })
  @IsString()
  @IsOptional()
  deviceInfo?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Active refresh token to rotate' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
