'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import {
  TelegramGroup,
  CreateTelegramGroupData,
  UpdateTelegramGroupData,
} from '@/lib/api/telegram-groups';
import { apiClient } from '@/lib/api/client';

/**
 * Validation schema for telegram group form
 */
const telegramGroupFormSchema = z.object({
  group_name: z
    .string()
    .min(1, 'Group name is required')
    .max(255, 'Group name must not exceed 255 characters')
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional()
    .transform((val) => (val?.trim() === '' ? undefined : val?.trim())),
  bot_id: z.string().uuid('Please select a valid bot'),
  settings: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return undefined;
      try {
        return JSON.parse(val.trim());
      } catch {
        throw new Error('Settings must be valid JSON');
      }
    }),
});

type TelegramGroupFormData = z.infer<typeof telegramGroupFormSchema>;

/**
 * Props interface for TelegramGroupForm component
 */
interface TelegramGroupFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<TelegramGroup>;
  onSubmit: (data: CreateTelegramGroupData | UpdateTelegramGroupData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

/**
 * Reusable form component for creating and editing telegram groups
 *
 * Features:
 * - Support for both create and edit modes
 * - Form validation with Zod schema
 * - Bot selection dropdown
 * - JSON settings validation
 * - Proper error handling and loading states
 * - Accessible with proper test IDs
 */
export function TelegramGroupForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: TelegramGroupFormProps) {
  const { toast } = useToast();

  // Fetch available bots for the dropdown
  const {
    data: botsResponse,
    isLoading: isLoadingBots,
    error: botsError,
  } = useQuery({
    queryKey: ['bots'],
    queryFn: () => apiClient.getBots(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const form = useForm<TelegramGroupFormData>({
    resolver: zodResolver(telegramGroupFormSchema),
    defaultValues: {
      group_name: initialData?.group_name || '',
      description: initialData?.description || '',
      bot_id: initialData?.bot_id || '',
      settings: initialData?.settings ? JSON.stringify(initialData.settings, null, 2) : '',
    },
  });

  const handleSubmit = async (data: TelegramGroupFormData) => {
    try {
      const submitData: CreateTelegramGroupData | UpdateTelegramGroupData = {
        group_name: data.group_name,
        description: data.description,
        settings: data.settings,
      };

      // Add bot_id only for create mode (required for creation)
      if (mode === 'create') {
        (submitData as CreateTelegramGroupData).bot_id = data.bot_id;
      }

      await onSubmit(submitData);

      // Reset form only on successful create
      if (mode === 'create') {
        form.reset();
      }
    } catch (error) {
      // Error handling is done by the parent component
      // Show a fallback toast if the parent doesn't handle it
      console.error('Form submission error:', error);

      if (error instanceof Error) {
        // Try to parse validation errors from the error message
        if (error.message.includes('group_name')) {
          form.setError('group_name', {
            type: 'server',
            message: 'Group name is invalid or already exists'
          });
        } else if (error.message.includes('bot_id')) {
          form.setError('bot_id', {
            type: 'server',
            message: 'Selected bot is invalid or unavailable'
          });
        } else if (error.message.includes('settings')) {
          form.setError('settings', {
            type: 'server',
            message: 'Settings format is invalid'
          });
        } else {
          toast.error(error.message || 'An unexpected error occurred.');
        }
      }
    }
  };

  // Show loading state while fetching bots
  if (isLoadingBots) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {mode === 'create' ? 'Create New Telegram Group' : 'Edit Telegram Group'}
          </h2>
          <p className="text-muted-foreground">
            {mode === 'create'
              ? 'Set up a new telegram group for member management.'
              : 'Update the telegram group details and settings.'
            }
          </p>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading bots...</span>
        </div>
      </div>
    );
  }

  // Show error state if bots failed to load
  if (botsError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {mode === 'create' ? 'Create New Telegram Group' : 'Edit Telegram Group'}
          </h2>
          <p className="text-muted-foreground">
            {mode === 'create'
              ? 'Set up a new telegram group for member management.'
              : 'Update the telegram group details and settings.'
            }
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          Failed to load bots. Please refresh the page and try again.
        </div>
      </div>
    );
  }

  const availableBots = botsResponse?.bots?.filter(bot => bot.is_active) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {mode === 'create' ? 'Create New Telegram Group' : 'Edit Telegram Group'}
        </h2>
        <p className="text-muted-foreground">
          {mode === 'create'
            ? 'Set up a new telegram group for member management.'
            : 'Update the telegram group details and settings.'
          }
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="group_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group Name *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter group name (e.g., VIP Premium Group)"
                    data-testid="group-name-input"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage data-testid="group-name-error" />
                <p className="text-sm text-muted-foreground">
                  A descriptive name for your telegram group
                </p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Enter a description for this group (optional)"
                    data-testid="group-description-input"
                    disabled={isLoading}
                    rows={3}
                  />
                </FormControl>
                <FormMessage data-testid="description-error" />
                <p className="text-sm text-muted-foreground">
                  Optional description to help identify the purpose of this group
                </p>
              </FormItem>
            )}
          />

          {mode === 'create' && (
            <FormField
              control={form.control}
              name="bot_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bot *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    data-testid="bot-select"
                    disabled={isLoading || availableBots.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="bot-select-trigger">
                        <SelectValue placeholder="Select a bot for this group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableBots.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No active bots available
                        </div>
                      ) : (
                        availableBots.map((bot) => (
                          <SelectItem key={bot.id} value={bot.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{bot.bot_name}</span>
                              {bot.bot_username && (
                                <span className="text-xs text-muted-foreground">
                                  @{bot.bot_username}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage data-testid="bot-error" />
                  <p className="text-sm text-muted-foreground">
                    Choose which bot will manage this telegram group
                  </p>
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="settings"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Advanced Settings</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder='{"welcome_message": "Welcome to our group!", "auto_approve": true}'
                    data-testid="group-settings-input"
                    disabled={isLoading}
                    rows={4}
                  />
                </FormControl>
                <FormMessage data-testid="settings-error" />
                <p className="text-sm text-muted-foreground">
                  Optional JSON configuration for group settings (leave empty for defaults)
                </p>
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading || availableBots.length === 0}
              data-testid="submit-button"
              className="flex-1"
            >
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" data-testid="loading-spinner" />
              )}
              {isLoading
                ? `${mode === 'create' ? 'Creating' : 'Updating'} Group...`
                : `${mode === 'create' ? 'Create' : 'Update'} Group`
              }
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

      {availableBots.length === 0 && mode === 'create' && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm">
          <p className="font-medium">No Active Bots Available</p>
          <p>You need to create and activate at least one bot before creating a telegram group.</p>
        </div>
      )}
    </div>
  );
}