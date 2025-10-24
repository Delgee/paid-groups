import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  RegistrationHandler,
  BotResponse,
} from './handlers/registration.handler';
import { ProjectCreationHandler } from './handlers/project-creation.handler';
import { GroupConnectionHandler } from './handlers/group-connection.handler';
import { PlanCreationHandler } from './handlers/plan-creation.handler';
import { AccountLinkingHandler } from './handlers/account-linking.handler';
import { StatusHandler } from './handlers/status.handler';
import { HelpHandler } from './handlers/help.handler';
import { CancelHandler } from './handlers/cancel.handler';
import {
  BotCommandLogger,
  LogCommandRequest,
} from './bot-command-logger.service';
import { TelegramBotService } from './telegram-bot.service';
import { ResponseStatus } from './entities/bot-command.entity';
import { SessionStep } from './interfaces/onboarding-session.interface';
import { OnboardingSessionService } from './onboarding-session.service';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Onboarding Bot')
@Controller('onboarding-bot')
export class OnboardingBotController {
  private readonly validBotToken =
    process.env.TELEGRAM_ONBOARDING_BOT_TOKEN ||
    'test-onboarding-bot-token-123';

  constructor(
    private readonly registrationHandler: RegistrationHandler,
    private readonly projectCreationHandler: ProjectCreationHandler,
    private readonly groupConnectionHandler: GroupConnectionHandler,
    private readonly planCreationHandler: PlanCreationHandler,
    private readonly accountLinkingHandler: AccountLinkingHandler,
    private readonly statusHandler: StatusHandler,
    private readonly helpHandler: HelpHandler,
    private readonly cancelHandler: CancelHandler,
    private readonly sessionService: OnboardingSessionService,
    private readonly botCommandLogger: BotCommandLogger,
    private readonly telegramBotService: TelegramBotService,
  ) {}

  @Post('webhook/:botToken')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Telegram webhook updates' })
  @ApiResponse({ status: 200, description: 'Update processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Invalid bot token' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async handleWebhook(
    @Param('botToken') botToken: string,
    @Body() update: any, // Use any to avoid strict validation
  ): Promise<{ ok: boolean }> {
    const startTime = Date.now();
    const correlationId = uuidv4();

    // Validate bot token
    if (botToken !== this.validBotToken) {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_BOT_TOKEN',
          message: 'Invalid bot token provided.',
        },
      });
    }

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      return this.handleCallbackQuery(
        botToken,
        update.callback_query,
        correlationId,
        startTime,
      );
    }

    // Validate message update structure
    if (
      !update ||
      !update.message ||
      !update.message.from ||
      !update.message.chat
    ) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message:
            'Invalid update format - message, from, and chat are required.',
        },
      });
    }

    const telegramUserId = update.message.from.id;
    const telegramChatId = update.message.chat.id;
    const messageText = update.message.text || '';

    let botResponse: BotResponse;
    let command = 'unknown';
    let responseStatus = ResponseStatus.SUCCESS;

    try {
      // Check for forwarded messages first
      if (
        update.message.forward_from ||
        update.message.forward_from_chat ||
        update.message.sender_chat
      ) {
        command = 'forwarded_message';

        // Extract forwarded message info
        const forwardedFrom = {
          chat: update.message.forward_from_chat,
          sender_chat: update.message.sender_chat,
        };

        botResponse = await this.groupConnectionHandler.handleForwardedMessage(
          telegramUserId,
          telegramChatId,
          forwardedFrom,
          correlationId,
        );
      } else if (messageText.startsWith('/')) {
        const cmd = messageText.split(' ')[0].substring(1).toLowerCase();
        command = cmd;

        switch (cmd) {
          case 'start':
            botResponse = await this.registrationHandler.handleStart(
              telegramUserId,
              telegramChatId,
              correlationId,
            );
            break;
          case 'newproject':
            botResponse =
              await this.projectCreationHandler.handleNewProjectCommand(
                telegramUserId,
                telegramChatId,
                correlationId,
              );
            break;
          case 'addgroup':
            botResponse =
              await this.groupConnectionHandler.handleAddGroupCommand(
                telegramUserId,
                telegramChatId,
                correlationId,
              );
            break;
          case 'createplan':
            botResponse =
              await this.planCreationHandler.handleCreatePlanCommand(
                telegramUserId,
                telegramChatId,
                correlationId,
              );
            break;
          case 'link':
            botResponse = await this.accountLinkingHandler.handleLinkCommand(
              telegramUserId,
              telegramChatId,
              correlationId,
            );
            break;
          case 'status':
            botResponse = await this.statusHandler.handleStatusCommand(
              telegramUserId,
              telegramChatId,
              correlationId,
            );
            break;
          case 'help':
            botResponse = { text: this.helpHandler.getHelpMessage() };
            break;
          case 'cancel':
            botResponse = {
              text: await this.cancelHandler.handleCancel(telegramUserId),
            };
            break;
          default:
            botResponse = {
              text: `Unknown command. Send /help to see available commands.`,
            };
        }
      } else {
        // Handle text input based on session state
        command = 'text_input';

        // Get current session to determine which handler to use
        const session = await this.sessionService.getSession(telegramUserId);

        if (!session) {
          botResponse = {
            text: 'Please send /start to begin, or use a command like /newproject, /addgroup, /createplan.',
          };
        } else {
          // Route to appropriate handler based on current step
          switch (session.current_step) {
            case SessionStep.REGISTRATION_EMAIL:
            case SessionStep.REGISTRATION_NAME:
            case SessionStep.REGISTRATION_COMPANY:
              botResponse =
                await this.registrationHandler.handleRegistrationFlow(
                  telegramUserId,
                  telegramChatId,
                  messageText,
                  correlationId,
                );
              break;

            case SessionStep.PROJECT_NAME:
            case SessionStep.PROJECT_DESCRIPTION:
            case SessionStep.BOT_TOKEN:
              botResponse =
                await this.projectCreationHandler.handleProjectCreationFlow(
                  telegramUserId,
                  telegramChatId,
                  messageText,
                  correlationId,
                );
              break;

            case SessionStep.GROUP_CONNECTION:
              botResponse =
                await this.groupConnectionHandler.handleGroupConnectionFlow(
                  telegramUserId,
                  telegramChatId,
                  messageText,
                  correlationId,
                );
              break;

            case SessionStep.PLAN_NAME:
            case SessionStep.PLAN_PRICE:
            case SessionStep.PLAN_DESCRIPTION:
              botResponse =
                await this.planCreationHandler.handlePlanCreationFlow(
                  telegramUserId,
                  telegramChatId,
                  messageText,
                  correlationId,
                );
              break;

            case SessionStep.LINK_EMAIL:
            case SessionStep.LINK_VERIFICATION:
              botResponse =
                await this.accountLinkingHandler.handleAccountLinkingFlow(
                  telegramUserId,
                  telegramChatId,
                  messageText,
                  correlationId,
                );
              break;

            default:
              botResponse = {
                text: 'Please use a command like /start, /newproject, /addgroup, /createplan, or /help.',
              };
          }
        }
      }

      // Log command
      const logRequest: LogCommandRequest = {
        telegram_user_id: telegramUserId,
        telegram_chat_id: telegramChatId,
        command,
        parameters: { text: messageText },
        response_status: responseStatus,
        response_time_ms: Date.now() - startTime,
        correlation_id: correlationId,
      };

      await this.botCommandLogger.log(logRequest);

      // Send response via Telegram Bot API
      await this.telegramBotService.sendMessage(
        botToken,
        telegramChatId,
        botResponse.text,
        botResponse.keyboard,
      );

      return { ok: true };
    } catch (error) {
      responseStatus = ResponseStatus.ERROR;

      // Log error
      await this.botCommandLogger.log({
        telegram_user_id: telegramUserId,
        telegram_chat_id: telegramChatId,
        command,
        response_status: ResponseStatus.ERROR,
        error_code: error.response?.error?.code || 'INTERNAL_ERROR',
        response_time_ms: Date.now() - startTime,
        correlation_id: correlationId,
      });

      throw error;
    }
  }

  private async handleCallbackQuery(
    botToken: string,
    callbackQuery: any,
    correlationId: string,
    startTime: number,
  ): Promise<{ ok: boolean }> {
    const telegramUserId = callbackQuery.from.id;
    const telegramChatId = callbackQuery.message.chat.id;
    const callbackData = callbackQuery.data;
    const callbackQueryId = callbackQuery.id;

    try {
      let botResponse: BotResponse;

      // Route callback query based on callback_data prefix
      if (callbackData.startsWith('group_type:')) {
        const groupType = callbackData.split(':')[1] as 'channel' | 'group';
        botResponse =
          await this.groupConnectionHandler.handleGroupTypeSelection(
            telegramUserId,
            telegramChatId,
            groupType,
            correlationId,
          );
      } else if (callbackData.startsWith('select_project:')) {
        const projectId = callbackData.split(':')[1];
        botResponse = await this.groupConnectionHandler.handleProjectSelection(
          telegramUserId,
          telegramChatId,
          projectId,
          correlationId,
        );
      } else if (callbackData.startsWith('select_plan_group:')) {
        const groupId = callbackData.split(':')[1];
        botResponse = await this.planCreationHandler.handleGroupSelection(
          telegramUserId,
          telegramChatId,
          groupId,
          correlationId,
        );
      } else if (callbackData === 'plan_groups_done') {
        botResponse = await this.planCreationHandler.handleGroupSelectionDone(
          telegramUserId,
          telegramChatId,
          correlationId,
        );
      } else if (callbackData.startsWith('plan_duration:')) {
        const days = callbackData.split(':')[1];
        botResponse = await this.planCreationHandler.handleDurationSelection(
          telegramUserId,
          telegramChatId,
          days,
          correlationId,
        );
      } else if (callbackData === 'add_group') {
        botResponse = await this.groupConnectionHandler.handleAddGroupCommand(
          telegramUserId,
          telegramChatId,
          correlationId,
        );
      } else if (callbackData === 'view_status') {
        botResponse = await this.statusHandler.handleStatusCommand(
          telegramUserId,
          telegramChatId,
          correlationId,
        );
      } else if (callbackData === 'create_plan') {
        botResponse = await this.planCreationHandler.handleCreatePlanCommand(
          telegramUserId,
          telegramChatId,
          correlationId,
        );
      } else if (callbackData === 'create_project') {
        botResponse = await this.projectCreationHandler.handleNewProjectCommand(
          telegramUserId,
          telegramChatId,
          correlationId,
        );
      } else {
        // Default routing to registration handler for basic callbacks
        botResponse = await this.registrationHandler.handleCallbackQuery(
          telegramUserId,
          telegramChatId,
          callbackData,
          correlationId,
        );
      }

      // Answer the callback query (removes loading state)
      await this.telegramBotService.answerCallbackQuery(
        botToken,
        callbackQueryId,
      );

      // Send response message
      await this.telegramBotService.sendMessage(
        botToken,
        telegramChatId,
        botResponse.text,
        botResponse.keyboard,
      );

      // Log command
      await this.botCommandLogger.log({
        telegram_user_id: telegramUserId,
        telegram_chat_id: telegramChatId,
        command: `callback:${callbackData}`,
        parameters: { callback_data: callbackData },
        response_status: ResponseStatus.SUCCESS,
        response_time_ms: Date.now() - startTime,
        correlation_id: correlationId,
      });

      return { ok: true };
    } catch (error) {
      // Log error
      await this.botCommandLogger.log({
        telegram_user_id: telegramUserId,
        telegram_chat_id: telegramChatId,
        command: `callback:${callbackData}`,
        response_status: ResponseStatus.ERROR,
        error_code: error.response?.error?.code || 'INTERNAL_ERROR',
        response_time_ms: Date.now() - startTime,
        correlation_id: correlationId,
      });

      throw error;
    }
  }
}
