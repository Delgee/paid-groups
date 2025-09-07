import { TenantScopedEntity, GroupType, MessageType } from './common';

export interface TelegramBot extends TenantScopedEntity {
  bot_username: string;
  bot_name: string;
  profile_picture_url?: string;
  is_active: boolean;
  webhook_url?: string;
  settings: Record<string, any>;
}

export interface CreateBotRequest {
  bot_token: string;
  bot_name: string;
  profile_picture?: string; // base64 encoded
}

export interface UpdateBotRequest {
  bot_name?: string;
  profile_picture?: string; // base64 encoded
  settings?: Record<string, any>;
}

export interface TelegramGroup extends TenantScopedEntity {
  bot_id: string;
  telegram_chat_id: number;
  group_name: string;
  group_type: GroupType;
  is_active: boolean;
  member_count: number;
  settings: Record<string, any>;
  synced_at?: string;
}

export interface ConnectGroupRequest {
  telegram_chat_id: number;
  group_name: string;
  group_type: GroupType;
}

export interface BotMessage extends TenantScopedEntity {
  bot_id: string;
  message_type: MessageType;
  template_key?: string;
  content: string;
  variables: Record<string, any>;
  is_active: boolean;
}

export interface CreateMessageRequest {
  message_type: MessageType;
  template_key?: string;
  content: string;
  variables?: Record<string, any>;
}

export interface BotCommand {
  command: 'ban' | 'unban' | 'extend' | 'stats';
  target_user_id: number;
  group_id?: string;
  parameters?: Record<string, any>;
}

export interface BotCommandResult {
  success: boolean;
  result: Record<string, any>;
}