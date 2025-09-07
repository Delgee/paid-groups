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
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    tenant_id: string;
    is_active: boolean;
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
      where: { email: registerDto.email },
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
      email: registerDto.email,
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
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
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

    // Generate tokens
    const tokens = await this.generateTokens(user);
    
    // Save refresh token
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
      
      // Save new refresh token
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

    const access_token = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refresh_token = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    );

    return { access_token, refresh_token };
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