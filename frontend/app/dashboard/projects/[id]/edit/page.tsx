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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { projectApi } from '@/lib/api/projects';
import { ArrowLeftIcon, RefreshCwIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { MONGOLIAN_BANKS } from '@/lib/constants/banks';

const formSchema = z.object({
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
  account_bank_code: z.string().min(1, 'Bank is required'),
  account_number: z.string().min(1, 'Account number is required').max(50, 'Account number cannot exceed 50 characters'),
  account_name: z.string().min(1, 'Account holder name is required').max(255, 'Account name cannot exceed 255 characters'),
});

type FormData = z.infer<typeof formSchema>;

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bot_username: '',
      display_name: '',
      description: '',
      welcome_message: '',
      account_bank_code: '',
      account_number: '',
      account_name: '',
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

      form.reset({
        bot_username: data.bot_username,
        display_name: data.display_name,
        description: data.description || '',
        welcome_message: data.welcome_message,
        account_bank_code: data.account_bank_code || '',
        account_number: data.account_number || '',
        account_name: data.account_name || '',
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to load project';
      toast.error(errorMessage);
      router.push('/dashboard/projects');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setSubmitting(true);

      // Clean up empty strings for optional fields
      const payload: any = {
        display_name: data.display_name,
        description: data.description || undefined,
        welcome_message: data.welcome_message,
        account_bank_code: data.account_bank_code,
        account_number: data.account_number,
        account_name: data.account_name,
      };

      await projectApi.update(projectId, payload);

      toast.success('Project updated successfully');

      router.push(`/dashboard/projects/${projectId}`);
    } catch (error: any) {
      console.error('Project update error:', error);

      // Handle validation errors from backend
      const errorData = error.response?.data?.error || error.response?.data;

      if (
        errorData?.code === 'VALIDATION_ERROR' &&
        errorData?.details?.field
      ) {
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
        toast.error('Permission denied: You do not have permission to update projects.');
      } else if (error.response?.status === 404) {
        toast.error('Project not found: The project you are trying to update does not exist.');
        router.push('/dashboard/projects');
      } else {
        // Generic error
        const message =
          errorData?.message ||
          error.response?.data?.message ||
          error.message ||
          'Failed to update project. Please try again.';

        toast.error(message);
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

              <div className='space-y-4 pt-4 border-t'>
                <h3 className='text-lg font-medium'>Bank Account Information</h3>
                <p className='text-sm text-muted-foreground'>
                  Configure bank account details for QPay payment integration
                </p>

                <FormField
                  control={form.control}
                  name='account_bank_code'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select a bank' />
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
                  name='account_number'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number *</FormLabel>
                      <FormControl>
                        <Input placeholder='490000869' {...field} />
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
                  name='account_name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Holder Name *</FormLabel>
                      <FormControl>
                        <Input placeholder='test account2' {...field} />
                      </FormControl>
                      <FormDescription>
                        Name of the account holder as registered with the bank
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
