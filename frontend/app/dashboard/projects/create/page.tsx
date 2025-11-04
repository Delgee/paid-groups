'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { projectApi } from '@/lib/api/projects';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeftIcon } from 'lucide-react';
import { MONGOLIAN_BANKS } from '@/lib/constants/banks';

const formSchema = z.object({
  bot_token: z.string()
    .min(1, 'Bot token is required')
    .regex(/^\d+:[A-Za-z0-9_-]+$/, 'Invalid bot token format'),
  bot_username: z.string()
    .min(1, 'Bot username is required. Please verify your bot token.')
    .max(32, 'Username cannot exceed 32 characters'),
  display_name: z.string()
    .min(2, 'Display name must be at least 2 characters')
    .max(255, 'Display name cannot exceed 255 characters'),
  description: z.string().max(512, 'Description cannot exceed 512 characters').optional(),
  welcome_message: z.string()
    .min(10, 'Welcome message must be at least 10 characters')
    .max(4096, 'Welcome message cannot exceed 4096 characters'),
  account_bank_code: z.string().min(1, 'Bank is required'),
  account_number: z.string().min(1, 'Account number is required').max(50, 'Account number cannot exceed 50 characters'),
  account_name: z.string().min(1, 'Account holder name is required').max(255, 'Account name cannot exceed 255 characters'),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [lastVerifiedToken, setLastVerifiedToken] = useState<string>('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bot_token: '',
      bot_username: '',
      display_name: '',
      description: '',
      welcome_message: '',
      account_bank_code: '',
      account_number: '',
      account_name: '',
    },
  });

  const handleVerifyToken = async (botToken: string) => {
    if (!botToken || !botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
      // Don't clear fields immediately - user might be editing
      return;
    }

    try {
      setVerifying(true);
      const botInfo = await projectApi.verifyToken(botToken);

      // Auto-fill fields
      form.setValue('bot_username', botInfo.username);
      form.setValue('display_name', botInfo.first_name);

      // Store the verified token
      setLastVerifiedToken(botToken);

      // Clear any existing errors
      form.clearErrors('bot_token');
      form.clearErrors('bot_username');
      form.clearErrors('display_name');

      toast.success(`Successfully verified @${botInfo.username}`);
    } catch (error: any) {
      // Clear fields on error
      form.setValue('bot_username', '');
      form.setValue('display_name', '');
      setLastVerifiedToken('');

      // Set error on bot_token field
      const errorMessage = error.response?.data?.error?.message || 'Could not verify bot token. Please check that the token is correct and the bot is active.';

      form.setError('bot_token', {
        type: 'manual',
        message: errorMessage,
      });
    } finally {
      setVerifying(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setSubmitting(true);

      // Clean up empty strings for optional fields
      const payload = {
        ...data,
        description: data.description || undefined,
      };

      const project = await projectApi.create(payload);

      toast.success('Project created successfully');

      // Redirect to project detail page
      router.push(`/dashboard/projects/${project.id}`);
    } catch (error: any) {
      console.error('Project creation error:', error);

      // Handle validation errors from backend
      const errorData = error.response?.data?.error || error.response?.data;

      if (errorData?.code === 'DUPLICATE_BOT_TOKEN' || error.response?.status === 409) {
        // Set error on specific field
        const errorMessage = errorData?.message || 'This bot token is already registered. Please use a different bot.';

        form.setError('bot_token', {
          type: 'manual',
          message: errorMessage,
        });

        toast.error(`Failed to create project: ${errorMessage}`);
      } else if (errorData?.code === 'VALIDATION_ERROR' && errorData?.details?.field) {
        // Set error on the specific field mentioned in the error
        const fieldName = errorData.details.field as keyof FormData;
        form.setError(fieldName, {
          type: 'manual',
          message: errorData.message || 'Validation failed',
        });

        toast.error(`Validation error: ${errorData.message || 'Please check the form for errors'}`);
      } else if (error.response?.status === 401) {
        toast.error('Authentication error: Your session has expired. Please login again.');
      } else if (error.response?.status === 403) {
        toast.error('Permission denied: You do not have permission to create projects.');
      } else {
        // Generic error
        const message = errorData?.message || error.response?.data?.message || error.message || 'Failed to create project. Please try again.';

        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeftIcon className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create Project</CardTitle>
          <CardDescription>
            Create a new project with a Telegram bot. You can add multiple groups and membership plans later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="bot_token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bot Token *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                        type="password"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          const newToken = e.target.value;

                          // Clear error when user starts typing
                          form.clearErrors('bot_token');

                          // Clear fields only if token has changed from verified one
                          if (lastVerifiedToken && newToken !== lastVerifiedToken) {
                            form.setValue('bot_username', '');
                            form.setValue('display_name', '');
                            setLastVerifiedToken('');
                          }
                        }}
                        onBlur={(e) => {
                          field.onBlur();
                          handleVerifyToken(e.target.value);
                        }}
                        disabled={verifying}
                      />
                    </FormControl>
                    <FormDescription>
                      {verifying ? (
                        <span className="text-blue-600">Verifying bot token...</span>
                      ) : (
                        'Get your bot token from @BotFather on Telegram. Bot details will be auto-filled.'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bot_username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bot Username *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Automatically filled after verification"
                        {...field}
                        readOnly
                        disabled
                        className="bg-gray-50"
                      />
                    </FormControl>
                    <FormDescription>
                      Auto-filled from Telegram API (read-only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Premium Content Project" {...field} />
                    </FormControl>
                    <FormDescription>
                      Auto-filled from bot, but you can change it to anything you like
                    </FormDescription>
                    <FormMessage />
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
                        placeholder="This project manages multiple premium groups..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description for internal reference
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="welcome_message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Welcome Message *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Welcome! Choose a membership plan to access our premium groups."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Message sent when users start the bot with /start
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Bank Account Information</h3>
                <p className="text-sm text-muted-foreground">
                  Configure bank account details for QPay payment integration
                </p>

                <FormField
                  control={form.control}
                  name="account_bank_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a bank" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MONGOLIAN_BANKS.map((bank) => (
                            <SelectItem key={bank.code} value={bank.code}>
                              {bank.name} ({bank.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the bank for payment processing
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="490000869" {...field} />
                      </FormControl>
                      <FormDescription>
                        Bank account number for receiving payments
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Holder Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="test account2" {...field} />
                      </FormControl>
                      <FormDescription>
                        Name of the account holder as registered with the bank
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
