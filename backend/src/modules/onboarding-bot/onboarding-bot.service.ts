import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TelegramUserAccountService } from './telegram-user-account.service';
import { OnboardingSessionService } from './onboarding-session.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { User } from '../auth/entities/user.entity';
import { Tenant, SubscriptionStatus } from '../tenant/entities/tenant.entity';
import { TelegramUserAccount } from './entities/telegram-user-account.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OnboardingBotService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly telegramUserAccountService: TelegramUserAccountService,
    private readonly sessionService: OnboardingSessionService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async registerUser(dto: RegisterUserDto): Promise<{
    user_id: string;
    tenant_id: string;
    telegram_user_account_id: string;
    message: string;
  }> {
    // Check for duplicate email
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException({
        error: {
          code: 'DUPLICATE_EMAIL',
          message: 'Email address already exists. Please use a different email or link your existing account.',
          details: { field: 'email' },
        },
      });
    }

    // Check for duplicate Telegram account
    const existingTelegramAccount = await this.telegramUserAccountService.findByTelegramUserId(
      dto.telegram_user_id,
    );

    if (existingTelegramAccount) {
      throw new ConflictException({
        error: {
          code: 'DUPLICATE_TELEGRAM_ACCOUNT',
          message: 'This Telegram account is already linked.',
        },
      });
    }

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create tenant
      const tenant = queryRunner.manager.create(Tenant, {
        name: dto.company_name,
        company_name: dto.company_name,
        subscription_status: SubscriptionStatus.ACTIVE,
        is_active: true,
      });
      const savedTenant = await queryRunner.manager.save(tenant);

      // Create user with OWNER role
      const hashedPassword = await bcrypt.hash(Math.random().toString(36), 10); // Random password
      const user = queryRunner.manager.create(User, {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: 'OWNER',
        tenant_id: savedTenant.id,
        is_active: true,
        email_verified: true, // Auto-verify for bot registrations
      });
      const savedUser = await queryRunner.manager.save(user);

      // Create telegram_user_account
      const telegramAccount = queryRunner.manager.create(TelegramUserAccount, {
        user_id: savedUser.id,
        telegram_user_id: dto.telegram_user_id,
        telegram_chat_id: dto.telegram_chat_id,
        telegram_username: dto.telegram_username,
        telegram_first_name: dto.telegram_first_name,
        telegram_last_name: dto.telegram_last_name,
        linked_at: new Date(),
        is_active: true,
        metadata: {},
      });
      const savedTelegramAccount = await queryRunner.manager.save(telegramAccount);

      await queryRunner.commitTransaction();

      return {
        user_id: savedUser.id,
        tenant_id: savedTenant.id,
        telegram_user_account_id: savedTelegramAccount.id,
        message: 'Account created successfully! You can now create projects and manage your groups.',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async linkAccount(data: {
    telegram_user_id: number;
    telegram_chat_id: number;
    telegram_username?: string;
    telegram_first_name?: string;
    telegram_last_name?: string;
    email: string;
    verification_code: string;
    correlation_id: string;
  }): Promise<{ user_id: string; message: string }> {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: data.email },
    });

    if (!user) {
      throw new BadRequestException({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'No account found with this email address.',
        },
      });
    }

    // Verify code (would check Redis in full implementation)
    // For now, placeholder logic
    if (data.verification_code.length !== 6) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_VERIFICATION_CODE',
          message: 'Invalid verification code.',
        },
      });
    }

    // Create telegram account link
    await this.telegramUserAccountService.create({
      user_id: user.id,
      telegram_user_id: data.telegram_user_id,
      telegram_chat_id: data.telegram_chat_id,
      telegram_username: data.telegram_username,
      telegram_first_name: data.telegram_first_name,
      telegram_last_name: data.telegram_last_name,
    });

    return {
      user_id: user.id,
      message: 'Account linked successfully! You can now manage your projects via Telegram.',
    };
  }

  async getStatus(telegramUserId: number): Promise<{
    company_name: string;
    projects_count: number;
    groups_count: number;
    plans_count: number;
    members_count: number;
  }> {
    const telegramAccount = await this.telegramUserAccountService.findByTelegramUserId(telegramUserId);

    if (!telegramAccount) {
      throw new BadRequestException({
        error: {
          code: 'NOT_REGISTERED',
          message: 'You need to register first. Send /start to begin.',
        },
      });
    }

    // Get user with tenant
    const user = await this.userRepository.findOne({
      where: { id: telegramAccount.user_id },
      relations: ['tenant'],
    });

    // Get counts (placeholder - would query actual data)
    const projectsCount = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM projects WHERE tenant_id = $1',
      [user.tenant.id],
    );

    return {
      company_name: user.tenant.company_name,
      projects_count: parseInt(projectsCount[0]?.count || '0'),
      groups_count: 0,
      plans_count: 0,
      members_count: 0,
    };
  }
}
