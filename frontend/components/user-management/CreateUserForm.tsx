'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  CreateUserRequest,
  CreateUserRequestSchema,
  CreateUserResponse,
  UserRole,
  apiClient,
  ApiClientError,
  userQueryKeys,
} from '@/lib/api/client';

interface CreateUserFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateUserForm({ onSuccess, onCancel }: CreateUserFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateUserRequest>({
    resolver: zodResolver(CreateUserRequestSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      role: 'admin' as UserRole,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: apiClient.createUser.bind(apiClient),
    onSuccess: (data: CreateUserResponse) => {
      toast.success(`${data.role.charAt(0).toUpperCase() + data.role.slice(1)} user ${data.name} has been created`);

      // Invalidate and refetch user list
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });

      // Reset form
      form.reset();

      // Call success callback
      onSuccess?.();
    },
    onError: (error: ApiClientError) => {
      if (error.isValidationError) {
        // Set field-specific errors
        const fieldErrors = error.getFieldErrors();
        Object.entries(fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof CreateUserRequest, {
            type: 'server',
            message: message as string,
          });
        });
      } else if (error.isDuplicateError) {
        form.setError('email', {
          type: 'server',
          message: 'A user with this email already exists',
        });
        toast.error('A user with this email already exists in your organization');
      } else if (error.isForbidden) {
        toast.error('Only owner users can create admin and moderator users');
      } else {
        toast.error(error.message || 'An unexpected error occurred');
      }
    },
  });

  const onSubmit = (data: CreateUserRequest) => {
    createUserMutation.mutate(data);
  };

  const isLoading = createUserMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create New User</h2>
        <p className="text-muted-foreground">
          Add a new admin or moderator user to your organization.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="user@example.com"
                    data-testid="user-email-input"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage data-testid="email-error" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="Enter secure password"
                    data-testid="user-password-input"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage data-testid="password-error" />
                <p className="text-sm text-muted-foreground">
                  Must be at least 8 characters with uppercase, lowercase, and number
                </p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="John Doe"
                    data-testid="user-name-input"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage data-testid="name-error" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  data-testid="user-role-select"
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger data-testid="user-role-select-trigger">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage data-testid="role-error" />
                <p className="text-sm text-muted-foreground">
                  Admin: Full access to bots, groups, and analytics. Moderator: Groups and memberships only.
                </p>
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              data-testid="create-user-submit"
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" data-testid="loading-spinner" />}
              {isLoading ? 'Creating User...' : 'Create User'}
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
    </div>
  );
}