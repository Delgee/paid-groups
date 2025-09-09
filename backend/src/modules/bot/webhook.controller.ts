import { 
  Controller, 
  Post, 
  Body, 
  Param, 
  HttpCode, 
  HttpStatus, 
  Logger,
  BadRequestException,
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { WebhookService, TelegramUpdate } from './services/webhook.service';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@ApiTags('Bot Webhooks')
@Controller('webhooks/telegram')
@UseGuards(RateLimitGuard)
export class BotWebhookController {
  private readonly logger = new Logger(BotWebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post(':botToken')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Receive Telegram bot webhook updates',
    description: 'Endpoint for Telegram to send bot updates. The bot token is included in the URL path for security.'
  })
  @ApiParam({
    name: 'botToken',
    description: 'Telegram bot token (acts as webhook secret)',
    example: '123456789:ABCdefGHIjklMNOpqrSTUvwxyz'
  })
  @ApiResponse({
    status: 200,
    description: 'Update processed successfully',
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        result: { type: 'string', example: 'Update processed' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid update format or bot token'
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded'
  })
  async receiveUpdate(
    @Param('botToken') botToken: string,
    @Body() update: TelegramUpdate
  ): Promise<{ ok: boolean; result: string }> {
    try {
      this.logger.debug(`Received webhook update ${update.update_id} for bot token: ${botToken.substring(0, 10)}...`);

      // Validate bot token format
      if (!this.isValidBotToken(botToken)) {
        throw new BadRequestException('Invalid bot token format');
      }

      // Validate update structure
      if (!this.isValidUpdate(update)) {
        throw new BadRequestException('Invalid update format');
      }

      // Process the update
      await this.webhookService.processUpdate(botToken, update);

      this.logger.debug(`Successfully processed update ${update.update_id}`);
      
      return {
        ok: true,
        result: 'Update processed successfully'
      };

    } catch (error) {
      this.logger.error(`Error processing webhook update ${update?.update_id}:`, error);
      
      // Return success to Telegram even on internal errors to avoid retries
      // Log the error for internal debugging
      return {
        ok: true,
        result: 'Update received'
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
    description: 'Health check endpoint for monitoring webhook availability'
  })
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate bot token format
   */
  private isValidBotToken(token: string): boolean {
    // Telegram bot token format: {bot_id}:{bot_hash}
    // Example: 123456789:ABCdefGHIjklMNOpqrSTUvwxyz
    const tokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
    return tokenRegex.test(token);
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
    const hasCallbackQuery = update.callback_query && typeof update.callback_query === 'object';
    const hasInlineQuery = update.inline_query && typeof update.inline_query === 'object';
    const hasChosenInlineResult = update.chosen_inline_result && typeof update.chosen_inline_result === 'object';
    const hasChannelPost = update.channel_post && typeof update.channel_post === 'object';
    const hasEditedMessage = update.edited_message && typeof update.edited_message === 'object';
    const hasEditedChannelPost = update.edited_channel_post && typeof update.edited_channel_post === 'object';

    return hasMessage || hasCallbackQuery || hasInlineQuery || hasChosenInlineResult || 
           hasChannelPost || hasEditedMessage || hasEditedChannelPost;
  }
}