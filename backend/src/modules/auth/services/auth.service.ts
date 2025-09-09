import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { Tenant, SubscriptionTier, SubscriptionStatus } from '../../tenant/entities/tenant.entity';

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  company_name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refresh_token: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    tenant_id: string;
    is_active: boolean;
    permissions: string[];
    last_login_at?: Date;
    created_at: Date;
    updated_at: Date;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create tenant first
    const tenant = this.tenantRepository.create({
      name: registerDto.company_name,
      company_name: registerDto.company_name,
      subscription_tier: SubscriptionTier.FREE,
      subscription_status: SubscriptionStatus.ACTIVE,
    });
    const savedTenant = await this.tenantRepository.save(tenant);

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(registerDto.password, saltRounds);

    // Create owner user
    const user = this.userRepository.create({
      tenant_id: savedTenant.id,
      email: registerDto.email.toLowerCase(),
      password_hash,
      name: registerDto.name,
      role: UserRole.OWNER,
      is_active: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(savedUser);
    
    // Save refresh token
    await this.saveRefreshToken(savedUser.id, tokens.refresh_token);

    return {
      ...tokens,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
        tenant_id: savedUser.tenant_id,
        is_active: savedUser.is_active,
        permissions: this.getUserPermissions(savedUser.role),
        created_at: savedUser.created_at,
        updated_at: savedUser.updated_at,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email.toLowerCase() },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.userRepository.update(user.id, {
      last_login_at: new Date(),
    });

    // Fetch updated user
    const updatedUser = await this.userRepository.findOne({
      where: { id: user.id },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);
    
    // Save refresh token
    await this.saveRefreshToken(user.id, tokens.refresh_token);

    return {
      ...tokens,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        tenant_id: updatedUser.tenant_id,
        is_active: updatedUser.is_active,
        permissions: this.getUserPermissions(updatedUser.role),
        last_login_at: updatedUser.last_login_at,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    try {
      const decoded = this.jwtService.verify(refreshTokenDto.refresh_token);
      
      const user = await this.userRepository.findOne({
        where: { 
          id: decoded.sub,
          refresh_token: refreshTokenDto.refresh_token,
        },
      });

      if (!user || !user.is_active || user.refresh_token_expires_at < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);
      
      // Save new refresh token (this invalidates the old one)
      await this.saveRefreshToken(user.id, tokens.refresh_token);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenant_id: user.tenant_id,
          is_active: user.is_active,
          permissions: this.getUserPermissions(user.role),
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      refresh_token: null,
      refresh_token_expires_at: null,
    });
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId, is_active: true },
    });
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenant_id: user.tenant_id,
      role: user.role,
    };

    const access_token = this.jwtService.sign(
      { 
        ...payload, 
        iat: Math.floor(Date.now() / 1000),
        jti: Date.now().toString() + Math.random().toString(36).substr(2, 5)
      }, 
      {
        expiresIn: '15m',
      }
    );

    const refresh_token = this.jwtService.sign(
      { 
        sub: user.id, 
        type: 'refresh', 
        jti: Date.now().toString() + Math.random().toString(36).substr(2, 9) // unique token ID
      },
      { expiresIn: '7d' }
    );

    return { 
      access_token, 
      refresh_token, 
      expires_in: 900 // 15 minutes in seconds
    };
  }

  getUserPermissions(role: UserRole): string[] {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return ['*']; // All permissions
      case UserRole.OWNER:
        return ['tenant:read', 'tenant:write', 'bots:*', 'members:*', 'payments:*'];
      case UserRole.ADMIN:
        return ['bots:read', 'bots:write', 'members:*'];
      case UserRole.MEMBER:
        return ['profile:read', 'profile:write'];
      default:
        return [];
    }
  }

  private async saveRefreshToken(userId: string, refresh_token: string) {
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 7); // 7 days

    await this.userRepository.update(userId, {
      refresh_token,
      refresh_token_expires_at: expires_at,
    });
  }
}