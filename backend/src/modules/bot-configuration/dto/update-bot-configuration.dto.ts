import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateBotConfigurationDto } from './create-bot-configuration.dto';

export class UpdateBotConfigurationDto extends PartialType(CreateBotConfigurationDto) {
  @ApiPropertyOptional({
    description: 'Last successful Telegram API sync timestamp',
    example: '2024-01-20T10:30:00Z',
  })
  last_sync_at?: Date;
}
