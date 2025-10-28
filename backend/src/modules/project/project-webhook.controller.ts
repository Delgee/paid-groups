import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProjectWebhookProcessorService } from './services/project-webhook-processor.service';

/**
 * TelegramUpdate interface matching Telegram Bot API Update object
 */
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      type: 'private' | 'group' | 'supergroup' | 'channel';
      title?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    date: number;
    text?: string;
    entities?: Array<{
      type: string;
      offset: number;
      length: number;
    }>;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    message?: any;
    data?: string;
  };
  chat_member?: {
    chat: {
      id: number;
      type: string;
      title?: string;
    };
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    date: number;
    old_chat_member: any;
    new_chat_member: any;
  };
  my_chat_member?: {
    chat: {
      id: number;
      type: string;
      title?: string;
    };
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    date: number;
    old_chat_member: any;
    new_chat_member: any;
  };
}

/**
 * ProjectWebhookController
 *
 * Handles incoming Telegram webhook updates for project bots.
 * Route pattern: POST /v1/projects/webhook/:tenantId/:projectId
 *
 * Security:
 * - Validates webhook secret token from Telegram
 * - Verifies tenant and project existence
 * - Multi-tenant isolation enforced
 */
@ApiTags('Project Webhooks')
@Controller('projects/webhook')
export class ProjectWebhookController {
  private readonly logger = new Logger(ProjectWebhookController.name);

  constructor(
    private readonly webhookProcessor: ProjectWebhookProcessorService,
  ) {}

  @Post(':tenantId/:projectId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Telegram webhook updates for a project bot',
    description:
      'Endpoint for Telegram to send bot updates. Validates webhook secret and processes updates.',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project UUID',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Update processed successfully',
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        result: { type: 'string', example: 'Update processed' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid update format or parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid webhook secret token',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async handleWebhook(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Headers('x-telegram-bot-api-secret-token') secretToken: string,
    @Body() update: TelegramUpdate,
  ): Promise<{ ok: boolean; result: string }> {
    try {
      this.logger.log(
        `Received webhook update ${update.update_id} for project ${projectId} (tenant: ${tenantId})`,
      );

      // Validate update structure
      if (!this.isValidUpdate(update)) {
        throw new BadRequestException({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update format - update_id is required',
          },
        });
      }

      // Validate webhook secret token (if provided by Telegram)
      if (!secretToken) {
        this.logger.warn(
          `Missing webhook secret token for project ${projectId}`,
        );
        throw new UnauthorizedException({
          error: {
            code: 'MISSING_SECRET_TOKEN',
            message: 'Webhook secret token is required',
          },
        });
      }

      // Process the update
      await this.webhookProcessor.processUpdate(
        tenantId,
        projectId,
        secretToken,
        update,
      );

      this.logger.log(
        `Successfully processed update ${update.update_id} for project ${projectId}`,
      );

      return {
        ok: true,
        result: 'Update processed successfully',
      };
    } catch (error) {
      this.logger.error(
        `Error processing webhook update ${update?.update_id} for project ${projectId}:`,
        error.stack,
      );

      // For authentication/authorization errors, re-throw to return proper status codes
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // For other errors, return success to Telegram to avoid retries
      // Log the error internally for debugging
      this.logger.error(
        `Internal error processing update ${update?.update_id}:`,
        error,
      );

      return {
        ok: true,
        result: 'Update received',
      };
    }
  }

  /**
   * Health check endpoint for webhook monitoring
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook health check',
    description: 'Health check endpoint for monitoring webhook availability',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook endpoint is healthy',
  })
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate update structure
   */
  private isValidUpdate(update: any): update is TelegramUpdate {
    if (!update || typeof update !== 'object') {
      return false;
    }

    // Must have update_id
    if (!update.update_id || typeof update.update_id !== 'number') {
      return false;
    }

    // Must have at least one type of update
    const hasMessage = update.message && typeof update.message === 'object';
    const hasCallbackQuery =
      update.callback_query && typeof update.callback_query === 'object';
    const hasChatMember =
      update.chat_member && typeof update.chat_member === 'object';
    const hasMyChatMember =
      update.my_chat_member && typeof update.my_chat_member === 'object';

    return hasMessage || hasCallbackQuery || hasChatMember || hasMyChatMember;
  }
}
