export enum SessionStep {
  IDLE = 'IDLE',
  REGISTRATION_EMAIL = 'REGISTRATION_EMAIL',
  REGISTRATION_NAME = 'REGISTRATION_NAME',
  REGISTRATION_COMPANY = 'REGISTRATION_COMPANY',
  PROJECT_NAME = 'PROJECT_NAME',
  PROJECT_DESCRIPTION = 'PROJECT_DESCRIPTION',
  BOT_TOKEN = 'BOT_TOKEN',
  PROJECT_BANK_PRIVACY_CONSENT = 'PROJECT_BANK_PRIVACY_CONSENT',
  PROJECT_BANK = 'PROJECT_BANK',
  PROJECT_ACCOUNT_NUMBER = 'PROJECT_ACCOUNT_NUMBER',
  PROJECT_ACCOUNT_NAME = 'PROJECT_ACCOUNT_NAME',
  PROJECT_CONFIRM = 'PROJECT_CONFIRM',
  GROUP_SELECTION = 'GROUP_SELECTION',
  GROUP_TYPE = 'GROUP_TYPE',
  GROUP_CONNECTION = 'GROUP_CONNECTION',
  PLAN_GROUP_SELECTION = 'PLAN_GROUP_SELECTION',
  PLAN_NAME = 'PLAN_NAME',
  PLAN_PRICE = 'PLAN_PRICE',
  PLAN_DURATION = 'PLAN_DURATION',
  PLAN_DESCRIPTION = 'PLAN_DESCRIPTION',
  LINK_EMAIL = 'LINK_EMAIL',
  LINK_VERIFICATION = 'LINK_VERIFICATION',
}

export interface SessionData {
  // Registration flow
  email?: string;
  name?: string;
  company_name?: string;
  user_id?: string;
  tenant_id?: string;

  // Project flow
  project_name?: string;
  project_description?: string;
  bot_token?: string;
  bot_username?: string;
  project_id?: string;
  account_bank_code?: string;
  account_number?: string;
  account_name?: string;
  bank_page?: number; // For bank selection pagination

  // Group flow
  selected_project_id?: string;
  group_type?: 'channel' | 'group';
  channel_id?: string;
  channel_title?: string;
  telegram_group_id?: string;

  // Plan flow
  selected_groups?: string[];
  plan_name?: string;
  plan_price?: number;
  plan_duration?: string;
  plan_description?: string;
  membership_plan_id?: string;

  // Link flow
  link_email?: string;
  verification_code?: string;

  // Resume support
  can_resume?: boolean;
  resume_offered?: boolean;
}

export interface OnboardingSession {
  telegram_user_id: number;
  telegram_chat_id: number;
  current_step: SessionStep;
  started_at: string;
  last_activity_at: string;
  correlation_id: string;
  data: SessionData;
}
