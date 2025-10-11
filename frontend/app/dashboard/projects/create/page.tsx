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
import { Switch } from '@/components/ui/switch';
import { projectApi } from '@/lib/api/projects';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeftIcon, CheckCircleIcon } from 'lucide-react';

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
  is_active: z.boolean().default(true),
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
      is_active: true,
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

      toast({
        title: 'Bot Verified',
        description: `Successfully verified @${botInfo.username}`,
      });
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

      toast({
        title: 'Success',
        description: 'Project created successfully',
      });

      // Redirect to project detail page
      router.push(`/dashboard/projects/${project.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create project',
        variant: 'destructive',
      });
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

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Enable this project to start processing payments
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

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
