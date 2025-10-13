import { Injectable } from '@nestjs/common';

@Injectable()
export class HelpHandler {
  getHelpMessage(): string {
    return `📚 Available Commands:

/start - Register new account or get started
/newproject - Create a new project with bot configuration
/addgroup - Connect a Telegram group to your project
/createplan - Create a membership plan for your groups
/status - View your account overview and statistics
/link - Link this Telegram account to existing web account
/cancel - Cancel current operation
/help - Show this help message

Need assistance? Visit our web dashboard or contact support.`;
  }
}
