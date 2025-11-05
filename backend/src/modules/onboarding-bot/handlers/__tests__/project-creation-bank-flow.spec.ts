import { Test, TestingModule } from '@nestjs/testing';
import { ProjectCreationHandler } from '../project-creation.handler';
import { OnboardingSessionService } from '../../onboarding-session.service';
import { TelegramUserAccountService } from '../../telegram-user-account.service';
import { ProjectService } from '../../../project/services/project.service';
import { TelegramApiService } from '../../../../integrations/telegram/telegram-api.service';
import { SessionStep } from '../../interfaces/onboarding-session.interface';
import { MONGOLIAN_BANKS } from '../../../../common/constants/banks.constant';

describe('ProjectCreationHandler - Bank Account Collection Flow', () => {
  let handler: ProjectCreationHandler;
  let sessionService: jest.Mocked<OnboardingSessionService>;
  let telegramUserAccountService: jest.Mocked<TelegramUserAccountService>;
  let projectService: jest.Mocked<ProjectService>;
  let telegramApiService: jest.Mocked<TelegramApiService>;

  const mockTelegramUserId = 123456789;
  const mockTelegramChatId = 987654321;
  const mockCorrelationId = 'test-correlation-id';

  const mockAccount = {
    telegram_user_id: mockTelegramUserId,
    user: {
      id: 'user-uuid',
      tenant_id: 'tenant-uuid',
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  beforeEach(async () => {
    const mockSessionService = {
      getSession: jest.fn(),
      advanceStep: jest.fn(),
      updateSession: jest.fn(),
      clearSession: jest.fn(),
    };

    const mockTelegramUserAccountService = {
      findByTelegramUserId: jest.fn().mockResolvedValue(mockAccount),
    };

    const mockProjectService = {
      create: jest.fn(),
    };

    const mockTelegramApiService = {
      verifyBotToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectCreationHandler,
        {
          provide: OnboardingSessionService,
          useValue: mockSessionService,
        },
        {
          provide: TelegramUserAccountService,
          useValue: mockTelegramUserAccountService,
        },
        {
          provide: ProjectService,
          useValue: mockProjectService,
        },
        {
          provide: TelegramApiService,
          useValue: mockTelegramApiService,
        },
      ],
    }).compile();

    handler = module.get<ProjectCreationHandler>(ProjectCreationHandler);
    sessionService = module.get(OnboardingSessionService);
    telegramUserAccountService = module.get(TelegramUserAccountService);
    projectService = module.get(ProjectService);
    telegramApiService = module.get(TelegramApiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PROJECT_BANK_PRIVACY_CONSENT step', () => {
    it('should advance to PROJECT_BANK when user types "I AGREE"', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_BANK_PRIVACY_CONSENT,
        data: {
          bot_token: 'test-token',
          bot_username: 'test_bot',
        },
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);
      sessionService.advanceStep.mockResolvedValue(mockSession as any);

      const result = await handler.handleProjectCreationFlow(
        mockTelegramUserId,
        mockTelegramChatId,
        'I AGREE',
        mockCorrelationId,
      );

      expect(sessionService.advanceStep).toHaveBeenCalledWith(
        mockTelegramUserId,
        SessionStep.PROJECT_BANK,
        {
          bank_page: 0,
        },
      );

      expect(result.text).toContain('Step 5 of 8');
      expect(result.text).toContain('Select your bank');
      expect(result.keyboard).toBeDefined();
      expect(result.keyboard.inline_keyboard).toBeDefined();
    });

    it('should reject when user does not type exactly "I AGREE"', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_BANK_PRIVACY_CONSENT,
        data: {},
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);

      const result = await handler.handleProjectCreationFlow(
        mockTelegramUserId,
        mockTelegramChatId,
        'yes',
        mockCorrelationId,
      );

      expect(result.text).toContain('must type exactly');
      expect(sessionService.advanceStep).not.toHaveBeenCalled();
    });

    it('should accept "I AGREE" case-insensitively', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_BANK_PRIVACY_CONSENT,
        data: {},
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);
      sessionService.advanceStep.mockResolvedValue(mockSession as any);

      await handler.handleProjectCreationFlow(
        mockTelegramUserId,
        mockTelegramChatId,
        'i agree',
        mockCorrelationId,
      );

      expect(sessionService.advanceStep).toHaveBeenCalled();
    });
  });

  describe('PROJECT_ACCOUNT_NUMBER step', () => {
    it('should accept valid account number (8-20 digits)', async () => {
      const validAccountNumber = '490000869';
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_ACCOUNT_NUMBER,
        data: {
          account_bank_code: '040000',
        },
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);
      sessionService.advanceStep.mockResolvedValue(mockSession as any);

      const result = await handler.handleProjectCreationFlow(
        mockTelegramUserId,
        mockTelegramChatId,
        validAccountNumber,
        mockCorrelationId,
      );

      expect(sessionService.advanceStep).toHaveBeenCalledWith(
        mockTelegramUserId,
        SessionStep.PROJECT_ACCOUNT_NAME,
        {
          account_number: validAccountNumber,
        },
      );

      // Should show masked account number
      expect(result.text).toContain('****0869');
      expect(result.text).toContain('Step 7 of 8');
    });

    it('should reject account number with less than 8 digits', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_ACCOUNT_NUMBER,
        data: {},
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);

      const result = await handler.handleProjectCreationFlow(
        mockTelegramUserId,
        mockTelegramChatId,
        '1234567', // 7 digits - too short
        mockCorrelationId,
      );

      expect(result.text).toContain('Invalid account number format');
      expect(result.text).toContain('8-20 characters');
      expect(sessionService.advanceStep).not.toHaveBeenCalled();
    });

    it('should reject account number with more than 20 digits', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_ACCOUNT_NUMBER,
        data: {},
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);

      const result = await handler.handleProjectCreationFlow(
        mockTelegramUserId,
        mockTelegramChatId,
        '123456789012345678901', // 21 digits - too long
        mockCorrelationId,
      );

      expect(result.text).toContain('Invalid account number format');
      expect(sessionService.advanceStep).not.toHaveBeenCalled();
    });

    it('should reject account number with special characters', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_ACCOUNT_NUMBER,
        data: {},
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);

      const result = await handler.handleProjectCreationFlow(
        mockTelegramUserId,
        mockTelegramChatId,
        '490-000-869',
        mockCorrelationId,
      );

      expect(result.text).toContain('Invalid account number format');
      expect(result.text).toContain('only digits');
      expect(sessionService.advanceStep).not.toHaveBeenCalled();
    });

    it('should reject account number with letters', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_ACCOUNT_NUMBER,
        data: {},
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);

      const result = await handler.handleProjectCreationFlow(
        mockTelegramUserId,
        mockTelegramChatId,
        '49000ABC9',
        mockCorrelationId,
      );

      expect(result.text).toContain('Invalid account number format');
      expect(sessionService.advanceStep).not.toHaveBeenCalled();
    });

    it('should reject empty account number', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_ACCOUNT_NUMBER,
        data: {},
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);

      const result = await handler.handleProjectCreationFlow(
        mockTelegramUserId,
        mockTelegramChatId,
        '   ',
        mockCorrelationId,
      );

      expect(result.text).toContain('cannot be empty');
      expect(sessionService.advanceStep).not.toHaveBeenCalled();
    });

    it('should trim whitespace from account number', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_ACCOUNT_NUMBER,
        data: {},
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);
      sessionService.advanceStep.mockResolvedValue(mockSession as any);

      await handler.handleProjectCreationFlow(
        mockTelegramUserId,
        mockTelegramChatId,
        '  490000869  ',
        mockCorrelationId,
      );

      expect(sessionService.advanceStep).toHaveBeenCalledWith(
        mockTelegramUserId,
        SessionStep.PROJECT_ACCOUNT_NAME,
        {
          account_number: '490000869', // Trimmed
        },
      );
    });
  });

  describe('PROJECT_ACCOUNT_NAME step', () => {
    it('should accept valid account holder name', async () => {
      const validName = 'Bat-Erdene Ganbaatar';
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_ACCOUNT_NAME,
        data: {
          project_name: 'Test Project',
          bot_username: 'test_bot',
          account_bank_code: '040000',
          account_number: '490000869',
        },
      };

      sessionService.getSession.mockResolvedValueOnce(mockSession as any);
      sessionService.advanceStep.mockResolvedValue({
        ...mockSession,
        current_step: SessionStep.PROJECT_CONFIRM,
        data: {
          ...mockSession.data,
          account_name: validName,
        },
      } as any);

      // Second call for reading confirm session
      sessionService.getSession.mockResolvedValueOnce({
        ...mockSession,
        data: {
          ...mockSession.data,
          account_name: validName,
        },
      } as any);

      const result = await handler.handleProjectCreationFlow(
        mockTelegramUserId,
        mockTelegramChatId,
        validName,
        mockCorrelationId,
      );

      expect(sessionService.advanceStep).toHaveBeenCalledWith(
        mockTelegramUserId,
        SessionStep.PROJECT_CONFIRM,
        {
          account_name: validName,
        },
      );

      expect(result.text).toContain('Step 8 of 8');
      expect(result.text).toContain('Confirm Your Project Details');
      expect(result.text).toContain(validName);
      expect(result.text).toContain('CONFIRM');
    });

    it('should reject empty account holder name', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_ACCOUNT_NAME,
        data: {},
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);

      const result = await handler.handleProjectCreationFlow(
        mockTelegramUserId,
        mockTelegramChatId,
        '',
        mockCorrelationId,
      );

      expect(result.text).toContain('cannot be empty');
      expect(sessionService.advanceStep).not.toHaveBeenCalled();
    });

    it('should reject account holder name exceeding 255 characters', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_ACCOUNT_NAME,
        data: {},
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);

      const longName = 'A'.repeat(256);
      const result = await handler.handleProjectCreationFlow(
        mockTelegramUserId,
        mockTelegramChatId,
        longName,
        mockCorrelationId,
      );

      expect(result.text).toContain('too long');
      expect(result.text).toContain('255');
      expect(sessionService.advanceStep).not.toHaveBeenCalled();
    });
  });

  describe('PROJECT_CONFIRM step', () => {
    it('should create project when user types "CONFIRM"', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_CONFIRM,
        data: {
          project_name: 'Test Project',
          project_description: 'Test Description',
          bot_token: 'test-token',
          bot_username: 'test_bot',
          account_bank_code: '040000',
          account_number: '490000869',
          account_name: 'Test Account Holder',
        },
      };

      const mockCreatedProject = {
        id: 'project-uuid',
        display_name: 'Test Project',
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);
      projectService.create.mockResolvedValue(mockCreatedProject as any);

      const result = await handler.handleProjectCreationFlow(
        mockTelegramUserId,
        mockTelegramChatId,
        'CONFIRM',
        mockCorrelationId,
      );

      expect(projectService.create).toHaveBeenCalledWith('tenant-uuid', {
        bot_token: 'test-token',
        bot_username: 'test_bot',
        display_name: 'Test Project',
        description: 'Test Description',
        welcome_message: expect.stringContaining('Test Project'),
        account_bank_code: '040000',
        account_number: '490000869',
        account_name: 'Test Account Holder',
      });

      expect(sessionService.clearSession).toHaveBeenCalledWith(
        mockTelegramUserId,
      );

      expect(result.text).toContain('Project Created Successfully');
      // Account should be masked in response
      expect(result.text).toContain('****0869');
      expect(result.text).not.toContain('490000869'); // Full account not shown
    });

    it('should reject when user does not type exactly "CONFIRM"', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_CONFIRM,
        data: {},
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);

      const result = await handler.handleProjectCreationFlow(
        mockTelegramUserId,
        mockTelegramChatId,
        'yes',
        mockCorrelationId,
      );

      expect(result.text).toContain('must type exactly');
      expect(projectService.create).not.toHaveBeenCalled();
    });

    it('should handle project creation failure gracefully', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_CONFIRM,
        data: {
          project_name: 'Test Project',
          bot_token: 'test-token',
          bot_username: 'test_bot',
          account_bank_code: '040000',
          account_number: '490000869',
          account_name: 'Test Account',
        },
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);
      projectService.create.mockRejectedValue(new Error('Database error'));

      const result = await handler.handleProjectCreationFlow(
        mockTelegramUserId,
        mockTelegramChatId,
        'CONFIRM',
        mockCorrelationId,
      );

      // Should clear session even on error
      expect(sessionService.clearSession).toHaveBeenCalledWith(
        mockTelegramUserId,
      );

      // Should not expose internal error details
      expect(result.text).toContain('Unable to create project');
      expect(result.text).toContain('temporarily unavailable');
      expect(result.text).not.toContain('Database error');

      // Should provide correlation ID for support
      expect(result.text).toContain(mockCorrelationId);
    });
  });

  describe('handleBankCallback', () => {
    it('should handle bank selection callback', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_BANK,
        data: {},
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);
      sessionService.advanceStep.mockResolvedValue(mockSession as any);

      const result = await handler.handleBankCallback(
        mockTelegramUserId,
        'bank:040000',
      );

      expect(sessionService.advanceStep).toHaveBeenCalledWith(
        mockTelegramUserId,
        SessionStep.PROJECT_ACCOUNT_NUMBER,
        {
          account_bank_code: '040000',
        },
      );

      expect(result.text).toContain('Худалдаа хөгжлийн банк');
      expect(result.text).toContain('Step 6 of 8');
      expect(result.text).toContain('8-20 digits');
    });

    it('should handle bank page navigation', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_BANK,
        data: {
          bank_page: 0,
        },
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);
      sessionService.updateSession.mockResolvedValue(mockSession as any);

      const result = await handler.handleBankCallback(
        mockTelegramUserId,
        'bank:page:1',
      );

      expect(sessionService.updateSession).toHaveBeenCalledWith(
        mockTelegramUserId,
        {
          data: {
            bank_page: 1,
          },
        },
      );

      expect(result.text).toContain('Page 2'); // 0-indexed, so page 1 = "Page 2"
      expect(result.keyboard).toBeDefined();
    });

    it('should reject invalid bank code', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_BANK,
        data: {},
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);

      const result = await handler.handleBankCallback(
        mockTelegramUserId,
        'bank:999999', // Invalid bank code
      );

      expect(result.text).toContain('Invalid bank selection');
      expect(sessionService.advanceStep).not.toHaveBeenCalled();
    });

    it('should reject callback if session expired', async () => {
      sessionService.getSession.mockResolvedValue(null);

      const result = await handler.handleBankCallback(
        mockTelegramUserId,
        'bank:040000',
      );

      expect(result.text).toContain('Session expired');
    });

    it('should reject callback if not in PROJECT_BANK step', async () => {
      const mockSession = {
        telegram_user_id: mockTelegramUserId,
        telegram_chat_id: mockTelegramChatId,
        current_step: SessionStep.PROJECT_NAME, // Wrong step
        data: {},
      };

      sessionService.getSession.mockResolvedValue(mockSession as any);

      const result = await handler.handleBankCallback(
        mockTelegramUserId,
        'bank:040000',
      );

      expect(result.text).toContain('Session expired');
    });
  });

  describe('Account number masking', () => {
    it('should mask account numbers longer than 4 characters', () => {
      const handler = new ProjectCreationHandler(
        sessionService,
        telegramUserAccountService,
        projectService,
        telegramApiService,
      );

      // Access private method via prototype
      const maskAccountNumber = (handler as any).maskAccountNumber.bind(handler);

      expect(maskAccountNumber('490000869')).toBe('*****0869');
      expect(maskAccountNumber('12345678')).toBe('****5678');
      expect(maskAccountNumber('123456789012')).toBe('********9012');
    });

    it('should not mask account numbers 4 characters or less', () => {
      const handler = new ProjectCreationHandler(
        sessionService,
        telegramUserAccountService,
        projectService,
        telegramApiService,
      );

      const maskAccountNumber = (handler as any).maskAccountNumber.bind(handler);

      expect(maskAccountNumber('1234')).toBe('1234');
      expect(maskAccountNumber('123')).toBe('123');
      expect(maskAccountNumber('12')).toBe('12');
    });
  });
});
