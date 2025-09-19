'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Hash,
  Link as LinkIcon
} from 'lucide-react';
import {
  TelegramGroup,
  ConnectChannelData,
  ConnectChannelResponse,
  telegramGroupsApi,
} from '@/lib/api/telegram-groups';

/**
 * Validation schema for channel connection form
 */
const channelConnectionSchema = z.object({
  telegram_chat_id: z
    .string()
    .min(1, 'Chat ID is required')
    .regex(/^-?\d+$/, 'Chat ID must be a valid number (e.g., -1001234567890)')
    .refine((val) => {
      const num = parseInt(val);
      return num < 0; // Telegram groups/channels always have negative IDs
    }, 'Chat ID must be negative for groups/channels'),
  invite_link: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true;
      return val.startsWith('https://t.me/');
    }, 'Invite link must be a valid Telegram URL (https://t.me/...)'),
  verify_permissions: z.boolean().default(true),
});

type ChannelConnectionFormData = z.infer<typeof channelConnectionSchema>;

/**
 * Props interface for ChannelConnectionForm component
 */
interface ChannelConnectionFormProps {
  group: TelegramGroup;
  onSubmit: (data: ConnectChannelData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Interface for channel verification state
 */
interface ChannelVerificationState {
  isVerifying: boolean;
  isVerified: boolean;
  channelInfo: ConnectChannelResponse['channel_info'] | null;
  error: string | null;
}

/**
 * Form component for connecting Telegram groups to Telegram channels
 *
 * Features:
 * - Real-time chat ID and invite link validation
 * - Channel verification with bot permission checking
 * - Channel information preview
 * - Step-by-step instructions for users
 * - Proper error handling and loading states
 * - Accessible with proper test IDs
 */
export function ChannelConnectionForm({
  group,
  onSubmit,
  onCancel,
  isLoading = false,
  className = '',
}: ChannelConnectionFormProps) {
  const { toast } = useToast();
  const [verificationState, setVerificationState] = useState<ChannelVerificationState>({
    isVerifying: false,
    isVerified: false,
    channelInfo: null,
    error: null,
  });

  const form = useForm<ChannelConnectionFormData>({
    resolver: zodResolver(channelConnectionSchema),
    defaultValues: {
      telegram_chat_id: group.telegram_chat_id?.toString() || '',
      invite_link: group.invite_link || '',
      verify_permissions: true,
    },
  });

  const watchedChatId = form.watch('telegram_chat_id');

  /**
   * Verify channel information and bot permissions
   */
  const handleVerifyChannel = async () => {
    const chatId = form.getValues('telegram_chat_id');

    if (!chatId) {
      toast.error('Please enter a chat ID first.');
      return;
    }

    // Validate chat ID format before making API call
    const validation = channelConnectionSchema.shape.telegram_chat_id.safeParse(chatId);
    if (!validation.success) {
      toast.error(`Invalid Chat ID: ${validation.error.errors[0].message}`);
      return;
    }

    setVerificationState(prev => ({
      ...prev,
      isVerifying: true,
      error: null,
      isVerified: false,
      channelInfo: null
    }));

    try {
      // Use the connect channel API to verify the channel
      const response = await telegramGroupsApi.connectChannel(group.id, {
        telegram_chat_id: chatId,
        verify_permissions: true,
      });

      setVerificationState({
        isVerifying: false,
        isVerified: response.success,
        channelInfo: response.channel_info,
        error: response.success ? null : response.message,
      });

      if (response.success) {
        toast.success(`Successfully connected to ${response.channel_info.title}`);
      } else {
        toast.error(`Verification Failed: ${response.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify channel';
      setVerificationState({
        isVerifying: false,
        isVerified: false,
        channelInfo: null,
        error: errorMessage,
      });

      toast.error(`Verification Failed: ${errorMessage}`);
    }
  };

  /**
   * Reset verification state when chat ID changes
   */
  const handleChatIdChange = (value: string) => {
    form.setValue('telegram_chat_id', value);

    // Reset verification state when chat ID changes
    if (verificationState.isVerified || verificationState.error) {
      setVerificationState({
        isVerifying: false,
        isVerified: false,
        channelInfo: null,
        error: null,
      });
    }
  };

  const handleSubmit = async (data: ChannelConnectionFormData) => {
    try {
      const submitData: ConnectChannelData = {
        telegram_chat_id: data.telegram_chat_id,
        invite_link: data.invite_link?.trim() || undefined,
        verify_permissions: data.verify_permissions,
      };

      await onSubmit(submitData);

      // Reset form on successful submission
      form.reset();
      setVerificationState({
        isVerifying: false,
        isVerified: false,
        channelInfo: null,
        error: null,
      });
    } catch (error) {
      // Error handling is done by the parent component
      console.error('Form submission error:', error);

      if (error instanceof Error) {
        // Try to parse validation errors from the error message
        if (error.message.includes('chat_id') || error.message.includes('telegram_chat_id')) {
          form.setError('telegram_chat_id', {
            type: 'server',
            message: 'Invalid chat ID or bot lacks access to this channel'
          });
        } else if (error.message.includes('invite_link')) {
          form.setError('invite_link', {
            type: 'server',
            message: 'Invalid invite link format'
          });
        } else {
          toast.error(error.message || 'Failed to connect channel.');
        }
      }
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Connect Channel to {group.group_name}
        </h2>
        <p className="text-muted-foreground">
          Connect this group to a Telegram channel for automated member synchronization.
        </p>
      </div>

      {/* Instructions Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium text-blue-900">How to Connect Your Channel</h3>
        </div>
        <div className="space-y-2 text-sm text-blue-800">
          <div>
            <strong>1. Get the Chat ID:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Forward any message from your channel to @userinfobot</li>
              <li>• The bot will reply with channel information including the Chat ID</li>
              <li>• Chat ID format: -1001234567890 (negative number)</li>
            </ul>
          </div>
          <div>
            <strong>2. Get the Invite Link (Optional):</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Open your channel settings in Telegram</li>
              <li>• Go to &quot;Invite Links&quot; and create or copy existing link</li>
              <li>• Format: https://t.me/+AbCdEfGhIjKlMnOp</li>
            </ul>
          </div>
          <div>
            <strong>3. Bot Permissions Required:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Add your bot to the channel as administrator</li>
              <li>• Grant &quot;Add Members&quot; and &quot;Manage Chat&quot; permissions</li>
              <li>• Bot username: @{group.bot?.bot_username || 'your_bot'}</li>
            </ul>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="telegram_chat_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Telegram Chat ID *
                  </div>
                </FormLabel>
                <div className="space-y-3">
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => handleChatIdChange(e.target.value)}
                      placeholder="-1001234567890"
                      data-testid="telegram-chat-id-input"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage data-testid="telegram-chat-id-error" />

                  {/* Verify Channel Button */}
                  {watchedChatId && !form.formState.errors.telegram_chat_id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleVerifyChannel}
                      disabled={verificationState.isVerifying || isLoading}
                      data-testid="verify-channel-button"
                      className="w-full sm:w-auto"
                    >
                      {verificationState.isVerifying && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {verificationState.isVerifying ? 'Verifying...' : 'Verify Channel'}
                    </Button>
                  )}

                  {/* Channel Verification Status */}
                  {verificationState.isVerified && verificationState.channelInfo && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3" data-testid="channel-verified">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Channel Verified</span>
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-green-700">
                        <div><strong>Title:</strong> {verificationState.channelInfo.title}</div>
                        <div><strong>Type:</strong> {verificationState.channelInfo.type}</div>
                        {verificationState.channelInfo.username && (
                          <div><strong>Username:</strong> @{verificationState.channelInfo.username}</div>
                        )}
                        {verificationState.channelInfo.member_count && (
                          <div><strong>Members:</strong> {verificationState.channelInfo.member_count.toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {verificationState.error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3" data-testid="channel-verification-error">
                      <div className="flex items-center gap-2 text-red-800">
                        <XCircle className="h-4 w-4" />
                        <span className="font-medium">Verification Failed</span>
                      </div>
                      <p className="mt-1 text-sm text-red-700">{verificationState.error}</p>
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  The unique identifier for your Telegram channel (negative number starting with -100)
                </p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="invite_link"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Invite Link (Optional)
                  </div>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="https://t.me/+AbCdEfGhIjKlMnOp"
                    data-testid="invite-link-input"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage data-testid="invite-link-error" />
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Optional invite link for the channel. This helps with member management and verification.
                    Example: https://t.me/+AbCdEfGhIjKlMnOp
                  </span>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="verify_permissions"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center space-x-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      data-testid="verify-permissions-checkbox"
                      disabled={isLoading}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal cursor-pointer">
                    Verify bot permissions
                  </FormLabel>
                </div>
                <FormMessage data-testid="verify-permissions-error" />
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    When enabled, the system will verify that your bot has the necessary permissions
                    to manage the channel before connecting. Recommended to keep enabled.
                  </span>
                </div>
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              data-testid="connect-channel-submit-button"
              className="flex-1"
            >
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" data-testid="loading-spinner" />
              )}
              {isLoading ? 'Connecting Channel...' : 'Connect Channel'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                data-testid="cancel-button"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Form>

      {/* Additional Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Need Help?</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>Can&apos;t find your Chat ID?</strong> Try using @JsonDumpBot - send any message
            from your channel to this bot and it will show detailed information including the chat ID.
          </p>
          <p>
            <strong>Bot permission issues?</strong> Make sure your bot is added as an administrator
            to the channel with &quot;Add Members&quot; and &quot;Manage Chat&quot; permissions enabled.
          </p>
          <p>
            <strong>Connection failing?</strong> Verify that the chat ID is correct and negative
            (channels/groups always have negative IDs in Telegram).
          </p>
        </div>
      </div>
    </div>
  );
}