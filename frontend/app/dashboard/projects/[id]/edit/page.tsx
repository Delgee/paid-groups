'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { projectApi } from '@/lib/api/projects';
import { ArrowLeftIcon, RefreshCwIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const formSchema = z.object({
  bot_token: z
    .string()
    .min(1, 'Bot token is required')
    .regex(/^\d+:[A-Za-z0-9_-]+$/, 'Invalid bot token format'),
  bot_username: z
    .string()
    .min(1, 'Bot username is required')
    .max(32, 'Username cannot exceed 32 characters'),
  display_name: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(255, 'Display name cannot exceed 255 characters'),
  description: z
    .string()
    .max(512, 'Description cannot exceed 512 characters')
    .optional(),
  welcome_message: z
    .string()
    .min(10, 'Welcome message must be at least 10 characters')
    .max(4096, 'Welcome message cannot exceed 4096 characters'),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [originalBotToken, setOriginalBotToken] = useState('');

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

  const { toast } = useToast();

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await projectApi.getById(projectId);

      // Store original bot token for comparison
      setOriginalBotToken(data.bot_token);

      form.reset({
        bot_token: data.bot_token,
        bot_username: data.bot_username,
        display_name: data.display_name,
        description: data.description || '',
        welcome_message: data.welcome_message,
        is_active: data.is_active,
      });
    } catch (error) {
      toast.error('Failed to load project');
      router.push('/dashboard/projects');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setSubmitting(true);

      // Clean up empty strings for optional fields
      // Don't send bot_token if it hasn't changed
      const payload: any = {
        display_name: data.display_name,
        description: data.description || undefined,
        welcome_message: data.welcome_message,
        is_active: data.is_active,
      };

      // Only include bot_token if it was actually changed
      if (data.bot_token !== originalBotToken) {
        payload.bot_token = data.bot_token;
      }

      await projectApi.update(projectId, payload);

      toast.success('Project updated successfully');

      router.push(`/dashboard/projects/${projectId}`);
    } catch (error: any) {
      console.error('Project update error:', error);

      // Handle validation errors from backend
      const errorData = error.response?.data?.error || error.response?.data;

      if (
        errorData?.code === 'DUPLICATE_BOT_TOKEN' ||
        error.response?.status === 409
      ) {
        // Set error on specific field
        const errorMessage =
          errorData?.message ||
          'This bot token is already registered. Please use a different bot.';

        form.setError('bot_token', {
          type: 'manual',
          message: errorMessage,
        });

        toast.error('Failed to Update Project', {
          description: errorMessage,
        });
      } else if (
        errorData?.code === 'VALIDATION_ERROR' &&
        errorData?.details?.field
      ) {
        // Set error on the specific field mentioned in the error
        const fieldName = errorData.details.field as keyof FormData;
        form.setError(fieldName, {
          type: 'manual',
          message: errorData.message || 'Validation failed',
        });

        toast.error('Validation Error', {
          description: errorData.message || 'Please check the form for errors',
        });
      } else if (error.response?.status === 401) {
        toast.error('Authentication Error', {
          description: 'Your session has expired. Please login again.',
        });
      } else if (error.response?.status === 403) {
        toast.error('Permission Denied', {
          description: 'You do not have permission to update projects.',
        });
      } else if (error.response?.status === 404) {
        toast.error('Project Not Found', {
          description: 'The project you are trying to update does not exist.',
        });
        router.push('/dashboard/projects');
      } else {
        // Generic error
        const message =
          errorData?.message ||
          error.response?.data?.message ||
          error.message ||
          'Failed to update project. Please try again.';

        toast.error('Error', {
          description: message,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <RefreshCwIcon className='h-8 w-8 animate-spin mx-auto mb-4' />
          <p className='text-muted-foreground'>Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto py-8 max-w-3xl'>
      <Button
        variant='ghost'
        onClick={() => router.push(`/dashboard/projects/${projectId}`)}
        className='mb-4'
      >
        <ArrowLeftIcon className='mr-2 h-4 w-4' />
        Back to Project
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Project</CardTitle>
          <CardDescription>Update your project settings</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <FormField
                control={form.control}
                name='bot_token'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bot Token *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='1234567890:ABCdefGHIjklMNOpqrsTUVwxyz'
                        type='password'
                        {...field}
                        readOnly
                        disabled
                        className='bg-gray-50'
                      />
                    </FormControl>
                    <FormDescription>
                      Bot token cannot be changed (read-only). To use a
                      different bot, create a new project.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='bot_username'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bot Username *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='my_payment_bot'
                        {...field}
                        readOnly
                        disabled
                        className='bg-gray-50'
                      />
                    </FormControl>
                    <FormDescription>
                      Bot username cannot be changed (read-only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='display_name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name *</FormLabel>
                    <FormControl>
                      <Input placeholder='Premium Content Project' {...field} />
                    </FormControl>
                    <FormDescription>
                      You can customize the display name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='This project manages multiple premium groups...'
                        className='resize-none'
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
                name='welcome_message'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Welcome Message *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Welcome! Choose a membership plan to access our premium groups.'
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
                name='is_active'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>Active</FormLabel>
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

              <div className='flex gap-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() =>
                    router.push(`/dashboard/projects/${projectId}`)
                  }
                  disabled={submitting}
                  className='flex-1'
                >
                  Cancel
                </Button>
                <Button type='submit' disabled={submitting} className='flex-1'>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
