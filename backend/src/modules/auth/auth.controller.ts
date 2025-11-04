import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, Matches, IsOptional, Length } from 'class-validator';
import { AuthService, RegisterDto, LoginDto, RefreshTokenDto } from './services/auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class RegisterRequestDto implements RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password (minimum 8 characters)',
    example: 'SecurePass123',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'Batjargal Oldokh',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Phone number (8 digits)',
    example: '99112210',
  })
  @IsString()
  @Matches(/^\d{8}$/, {
    message: 'Phone must be exactly 8 digits',
  })
  phone: string;

  @ApiProperty({
    description: 'Personal registration number (РД, 10 characters)',
    example: 'АМ05321712',
  })
  @IsString()
  @Length(10, 10, {
    message: 'Registration number must be exactly 10 characters',
  })
  register_number: string;

  @ApiPropertyOptional({
    description: 'Company/business name (optional, auto-generated if not provided)',
    example: 'Premium Telegram Groups',
  })
  @IsString()
  @IsOptional()
  company_name?: string;
}

class LoginRequestDto implements LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

class RefreshTokenRequestDto implements RefreshTokenDto {
  @IsString()
  refresh_token: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new tenant and owner user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(
    @Body(ValidationPipe) registerDto: RegisterRequestDto,
  ) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body(ValidationPipe) loginDto: LoginRequestDto,
  ) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body(ValidationPipe) refreshTokenDto: RefreshTokenRequestDto,
  ) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Request() req) {
    await this.authService.logout(req.user.sub);
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({ status: 200, description: 'User info retrieved' })
  async getMe(@Request() req) {
    const user = await this.authService.validateUser(req.user.sub);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenant_id: user.tenant_id,
      is_active: user.is_active,
      permissions: this.authService.getUserPermissions(user.role),
      last_login_at: user.last_login_at,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}