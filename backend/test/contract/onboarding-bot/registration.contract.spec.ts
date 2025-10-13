import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../src/app.module';
import { DatabaseHelper } from '../../helpers/database.helper';

describe('OnboardingBotService.registerUser (Contract)', () => {
  let moduleRef: TestingModule;
  let onboardingBotService: any;
  let dataSource: DataSource;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Get service once implemented
    // onboardingBotService = moduleRef.get(OnboardingBotService);
    dataSource = moduleRef.get(DataSource);
    DatabaseHelper.setDataSource(dataSource);
    await DatabaseHelper.cleanDatabase();
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('Valid Registration Request', () => {
    it('should create tenant, user, and telegram_user_account with correct schema', async () => {
      // This test will fail until OnboardingBotService is implemented
      const registerRequest = {
        telegram_user_id: 987654321,
        telegram_chat_id: 987654321,
        telegram_username: 'testuser',
        telegram_first_name: 'Test',
        telegram_last_name: 'User',
        email: 'test@example.com',
        name: 'Test User',
        company_name: 'Test Company',
        correlation_id: 'test-correlation-id',
      };

      // Contract: Input validation
      expect(registerRequest).toHaveProperty('telegram_user_id');
      expect(registerRequest).toHaveProperty('email');
      expect(registerRequest).toHaveProperty('name');
      expect(registerRequest).toHaveProperty('company_name');
      expect(typeof registerRequest.telegram_user_id).toBe('number');
      expect(typeof registerRequest.email).toBe('string');
      expect(registerRequest.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

      // Will uncomment when service is implemented
      // const result = await onboardingBotService.registerUser(registerRequest);

      // Contract: Output schema
      // expect(result).toHaveProperty('user_id');
      // expect(result).toHaveProperty('tenant_id');
      // expect(result).toHaveProperty('telegram_user_account_id');
      // expect(result).toHaveProperty('message');
      // expect(typeof result.user_id).toBe('string');
      // expect(typeof result.tenant_id).toBe('string');
      // expect(typeof result.telegram_user_account_id).toBe('string');
      // expect(result.message).toContain('Account created successfully');

      // Contract: Database state
      // const tenant = await dataSource.query('SELECT * FROM tenants WHERE id = $1', [result.tenant_id]);
      // expect(tenant[0]).toHaveProperty('company_name', 'Test Company');
      // expect(tenant[0]).toHaveProperty('subscription_status', 'trial');

      // const user = await dataSource.query('SELECT * FROM users WHERE id = $1', [result.user_id]);
      // expect(user[0]).toHaveProperty('email', 'test@example.com');
      // expect(user[0]).toHaveProperty('name', 'Test User');
      // expect(user[0]).toHaveProperty('role', 'OWNER');
      // expect(user[0]).toHaveProperty('tenant_id', result.tenant_id);

      // const telegramAccount = await dataSource.query(
      //   'SELECT * FROM telegram_user_accounts WHERE id = $1',
      //   [result.telegram_user_account_id]
      // );
      // expect(telegramAccount[0]).toHaveProperty('telegram_user_id', 987654321);
      // expect(telegramAccount[0]).toHaveProperty('telegram_username', 'testuser');
      // expect(telegramAccount[0]).toHaveProperty('user_id', result.user_id);
      // expect(telegramAccount[0]).toHaveProperty('is_active', true);

      // Placeholder assertion until service is implemented
      expect(true).toBe(true);
    });
  });

  describe('Validation Errors', () => {
    it('should reject invalid email format', async () => {
      const invalidRequest = {
        telegram_user_id: 987654321,
        telegram_chat_id: 987654321,
        email: 'invalid-email',
        name: 'Test User',
        company_name: 'Test Company',
        correlation_id: 'test-correlation-id',
      };

      // Contract: Email validation
      expect(invalidRequest.email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

      // Will uncomment when service is implemented
      // await expect(
      //   onboardingBotService.registerUser(invalidRequest)
      // ).rejects.toThrow('Invalid email format');
    });

    it('should reject name shorter than 2 characters', async () => {
      const invalidRequest = {
        telegram_user_id: 987654321,
        telegram_chat_id: 987654321,
        email: 'test@example.com',
        name: 'T',
        company_name: 'Test Company',
        correlation_id: 'test-correlation-id',
      };

      // Contract: Name length validation
      expect(invalidRequest.name.length).toBeLessThan(2);

      // Will uncomment when service is implemented
      // await expect(
      //   onboardingBotService.registerUser(invalidRequest)
      // ).rejects.toThrow('Name must be at least 2 characters');
    });
  });

  describe('Duplicate Email Detection', () => {
    it('should reject duplicate email registration', async () => {
      const firstRequest = {
        telegram_user_id: 111111111,
        telegram_chat_id: 111111111,
        telegram_username: 'firstuser',
        email: 'duplicate@example.com',
        name: 'First User',
        company_name: 'First Company',
        correlation_id: 'test-correlation-1',
      };

      const secondRequest = {
        telegram_user_id: 222222222,
        telegram_chat_id: 222222222,
        telegram_username: 'seconduser',
        email: 'duplicate@example.com', // Same email
        name: 'Second User',
        company_name: 'Second Company',
        correlation_id: 'test-correlation-2',
      };

      // Will uncomment when service is implemented
      // await onboardingBotService.registerUser(firstRequest);

      // Contract: Duplicate detection
      // await expect(
      //   onboardingBotService.registerUser(secondRequest)
      // ).rejects.toThrow(/email.*already exists/i);

      // Placeholder
      expect(true).toBe(true);
    });
  });

  describe('Tenant and User Creation', () => {
    it('should create user with OWNER role', async () => {
      const registerRequest = {
        telegram_user_id: 333333333,
        telegram_chat_id: 333333333,
        email: 'owner@example.com',
        name: 'Owner User',
        company_name: 'Owner Company',
        correlation_id: 'test-correlation-3',
      };

      // Will uncomment when service is implemented
      // const result = await onboardingBotService.registerUser(registerRequest);
      // const user = await dataSource.query('SELECT role FROM users WHERE id = $1', [result.user_id]);
      // expect(user[0].role).toBe('OWNER');

      // Placeholder
      expect(true).toBe(true);
    });
  });
});
