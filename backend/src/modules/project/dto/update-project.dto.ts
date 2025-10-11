import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiPropertyOptional({
    description: 'Last successful Telegram API sync timestamp',
    example: '2024-01-20T10:30:00Z',
  })
  last_sync_at?: Date;
}
