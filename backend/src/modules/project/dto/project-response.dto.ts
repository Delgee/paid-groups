import { ApiProperty } from '@nestjs/swagger';
import { Project } from '../entities/project.entity';

export class ProjectResponseDto {
  @ApiProperty({ description: 'Project ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Tenant ID', format: 'uuid' })
  tenant_id: string;

  @ApiProperty({ description: 'Masked bot token' })
  bot_token: string;

  @ApiProperty({ description: 'Bot username' })
  bot_username: string;

  @ApiProperty({ description: 'Display name' })
  display_name: string;

  @ApiProperty({ description: 'Description', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Welcome message' })
  welcome_message: string;

  @ApiProperty({ description: 'Is active' })
  is_active: boolean;

  @ApiProperty({ description: 'Last sync timestamp', nullable: true })
  last_sync_at?: Date;

  @ApiProperty({ description: 'Bot avatar file ID from Telegram', nullable: true })
  bot_avatar_file_id?: string;

  @ApiProperty({ description: 'Bot avatar download URL from Telegram CDN', nullable: true })
  bot_avatar_url?: string;

  @ApiProperty({ description: 'Webhook URL', nullable: true })
  webhook_url?: string;

  @ApiProperty({ description: 'Settings' })
  settings: Record<string, any>;

  @ApiProperty({ description: 'Message templates' })
  message_templates: Record<string, any>;

  @ApiProperty({ description: 'Bank code for payment account' })
  account_bank_code: string;

  @ApiProperty({ description: 'Bank account number' })
  account_number: string;

  @ApiProperty({ description: 'Account holder name' })
  account_name: string;

  @ApiProperty({ description: 'Created at timestamp' })
  created_at: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updated_at: Date;

  static fromEntity(project: Project): ProjectResponseDto {
    const dto = new ProjectResponseDto();
    dto.id = project.id;
    dto.tenant_id = project.tenant_id;
    dto.bot_token = '***'; // Always mask
    dto.bot_username = project.bot_username;
    dto.display_name = project.display_name;
    dto.description = project.description;
    dto.welcome_message = project.welcome_message;
    dto.is_active = project.is_active;
    dto.last_sync_at = project.last_sync_at;
    dto.bot_avatar_file_id = project.bot_avatar_file_id;
    dto.bot_avatar_url = project.bot_avatar_url;
    dto.webhook_url = project.webhook_url;
    dto.settings = project.settings;
    dto.message_templates = project.message_templates;
    dto.account_bank_code = project.account_bank_code;
    dto.account_number = project.account_number;
    dto.account_name = project.account_name;
    dto.created_at = project.created_at;
    dto.updated_at = project.updated_at;
    return dto;
  }
}

export class PaginatedProjectsResponseDto {
  @ApiProperty({ description: 'List of projects', type: [ProjectResponseDto] })
  data: ProjectResponseDto[];

  @ApiProperty({ description: 'Total number of projects' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}
