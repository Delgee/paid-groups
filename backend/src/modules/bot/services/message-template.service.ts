import { Injectable } from '@nestjs/common';

export interface TemplateVariables {
  user_name?: string;
  user_first_name?: string;
  plan_name?: string;
  group_name?: string;
  amount?: string;
  currency?: string;
  payment_id?: string;
  expires_at?: string;
  invite_link?: string;
  payment_date?: string;
  duration?: string;
  failure_reason?: string;
  [key: string]: string | undefined;
}

export interface MessageTemplates {
  welcome_message?: string;
  payment_success?: string;
  payment_failed?: string;
  expiration_warning_7days?: string;
  expiration_warning_3days?: string;
  expiration_warning_1day?: string;
  membership_expired?: string;
}

export const DEFAULT_TEMPLATES: MessageTemplates = {
  welcome_message: `
🎉 <b>Welcome to {{group_name}}!</b>

Hi {{user_name}}, your membership is now active!

<b>Plan:</b> {{plan_name}}
<b>Expires:</b> {{expires_at}}

Click the link below to join the group:
{{invite_link}}

<i>Note: This invite link is for you only and expires in 7 days.</i>
  `.trim(),

  payment_success: `
💰 <b>Payment Confirmation</b>

Your payment has been successfully processed!

<b>Amount:</b> {{amount}} {{currency}}
<b>Payment ID:</b> {{payment_id}}
<b>Date:</b> {{payment_date}}

<b>Group:</b> {{group_name}}
<b>Membership expires:</b> {{expires_at}}

Thank you for your payment! 🎉
  `.trim(),

  payment_failed: `
❌ <b>Payment Failed</b>

Unfortunately, your payment could not be processed.

<b>Amount:</b> {{amount}} {{currency}}
<b>Payment ID:</b> {{payment_id}}
{{failure_reason}}

Please try again or contact support if the problem persists.
  `.trim(),

  expiration_warning_7days: `
⏰ <b>Membership Expiring Soon</b>

Hi {{user_name}}, your membership to {{group_name}} will expire in 7 days.

<b>Expires on:</b> {{expires_at}}

Renew now to continue enjoying premium access!
  `.trim(),

  expiration_warning_3days: `
⚠️ <b>Membership Expiring Soon</b>

Hi {{user_name}}, your membership to {{group_name}} will expire in 3 days.

<b>Expires on:</b> {{expires_at}}

Don't miss out - renew your membership today!
  `.trim(),

  expiration_warning_1day: `
🚨 <b>Last Chance - Membership Expiring Tomorrow!</b>

Hi {{user_name}}, your membership to {{group_name}} expires tomorrow.

<b>Expires on:</b> {{expires_at}}

Renew now to avoid losing access!
  `.trim(),

  membership_expired: `
⛔ <b>Membership Expired</b>

Hi {{user_name}}, your membership to {{group_name}} has expired.

You will be removed from the group shortly.

To regain access, please purchase a new membership.
  `.trim(),
};

@Injectable()
export class MessageTemplateService {
  /**
   * Process template by replacing variables
   */
  processTemplate(template: string, variables: TemplateVariables): string {
    let processed = template;

    // Replace all {{variable}} placeholders
    for (const [key, value] of Object.entries(variables)) {
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processed = processed.replace(regex, value);
      }
    }

    // Remove any remaining unreplaced variables (optional placeholders)
    processed = processed.replace(/{{[^}]+}}/g, '');

    return processed.trim();
  }

  /**
   * Get template from bot or use default
   */
  getTemplate(
    botTemplates: MessageTemplates | Record<string, any>,
    templateName: keyof MessageTemplates,
  ): string {
    return botTemplates?.[templateName] || DEFAULT_TEMPLATES[templateName] || '';
  }

  /**
   * Build welcome message with template
   */
  buildWelcomeMessage(
    botTemplates: MessageTemplates | Record<string, any>,
    variables: TemplateVariables,
  ): string {
    const template = this.getTemplate(botTemplates, 'welcome_message');
    return this.processTemplate(template, variables);
  }

  /**
   * Build payment success message with template
   */
  buildPaymentSuccessMessage(
    botTemplates: MessageTemplates | Record<string, any>,
    variables: TemplateVariables,
  ): string {
    const template = this.getTemplate(botTemplates, 'payment_success');
    return this.processTemplate(template, variables);
  }

  /**
   * Build payment failed message with template
   */
  buildPaymentFailedMessage(
    botTemplates: MessageTemplates | Record<string, any>,
    variables: TemplateVariables,
  ): string {
    const template = this.getTemplate(botTemplates, 'payment_failed');
    return this.processTemplate(template, variables);
  }

  /**
   * Build expiration warning message with template
   */
  buildExpirationWarningMessage(
    botTemplates: MessageTemplates | Record<string, any>,
    daysUntilExpiry: number,
    variables: TemplateVariables,
  ): string {
    let templateName: keyof MessageTemplates = 'expiration_warning_7days';

    if (daysUntilExpiry <= 1) {
      templateName = 'expiration_warning_1day';
    } else if (daysUntilExpiry <= 3) {
      templateName = 'expiration_warning_3days';
    }

    const template = this.getTemplate(botTemplates, templateName);
    return this.processTemplate(template, variables);
  }

  /**
   * Build membership expired message with template
   */
  buildMembershipExpiredMessage(
    botTemplates: MessageTemplates | Record<string, any>,
    variables: TemplateVariables,
  ): string {
    const template = this.getTemplate(botTemplates, 'membership_expired');
    return this.processTemplate(template, variables);
  }

  /**
   * Get default templates for initialization
   */
  getDefaultTemplates(): MessageTemplates {
    return DEFAULT_TEMPLATES;
  }

  /**
   * Validate template syntax (check for balanced braces)
   */
  validateTemplate(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unbalanced braces
    const openBraces = (template.match(/{{/g) || []).length;
    const closeBraces = (template.match(/}}/g) || []).length;

    if (openBraces !== closeBraces) {
      errors.push('Template has unbalanced braces {{ }}');
    }

    // Check for invalid variable names
    const variables = template.match(/{{([^}]+)}}/g);
    if (variables) {
      for (const variable of variables) {
        const varName = variable.replace(/[{}]/g, '');
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
          errors.push(`Invalid variable name: ${variable}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
