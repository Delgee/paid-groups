import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService, RegisterDto, LoginDto, RefreshTokenDto } from './services/auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class RegisterRequestDto implements RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;

  @IsString()
  company_name: string;
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
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body(ValidationPipe) loginDto: LoginRequestDto,
  ) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body(ValidationPipe) refreshTokenDto: RefreshTokenRequestDto,
  ) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
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
      last_login_at: user.last_login_at,
      created_at: user.created_at,
    };
  }
}