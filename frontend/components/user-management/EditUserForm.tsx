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
import { z } from 'zod';
import {
  UpdateUserRequest,
  CreateUserResponse,
  UserRole,
  UserRoleSchema,
  apiClient,
  ApiClientError,
  userQueryKeys,
  UserSummary,
} from '@/lib/api/client';

const UpdateUserRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address').optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    )
    .optional()
    .or(z.literal('')),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must not exceed 100 characters')
    .regex(
      /^[a-zA-Z0-9\s\-]+$/,
      'Name can only contain letters, numbers, spaces, and hyphens',
    )
    .optional(),
  role: UserRoleSchema.optional(),
});

type UpdateUserFormData = z.infer<typeof UpdateUserRequestSchema>;

interface EditUserFormProps {
  user: UserSummary;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditUserForm({ user, onSuccess, onCancel }: EditUserFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UpdateUserFormData>({
    resolver: zodResolver(UpdateUserRequestSchema),
    defaultValues: {
      email: user.email,
      password: '',
      name: user.name,
      role: user.role as UserRole,
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: (data: UpdateUserRequest) => apiClient.updateUser(user.id, data),
    onSuccess: (data: CreateUserResponse) => {
      toast.success(`${data.role.charAt(0).toUpperCase() + data.role.slice(1)} user ${data.name} has been updated`);

      // Invalidate and refetch user list
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });

      // Call success callback
      onSuccess?.();
    },
    onError: (error: ApiClientError) => {
      if (error.isValidationError) {
        // Set field-specific errors
        const fieldErrors = error.getFieldErrors();
        Object.entries(fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof UpdateUserFormData, {
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
        toast.error('You do not have permission to update this user');
      } else {
        toast.error(error.message || 'An unexpected error occurred');
      }
    },
  });

  const onSubmit = (data: UpdateUserFormData) => {
    // Only send changed fields
    const updateData: UpdateUserRequest = {};

    if (data.email && data.email !== user.email) {
      updateData.email = data.email;
    }

    if (data.password && data.password !== '') {
      updateData.password = data.password;
    }

    if (data.name && data.name !== user.name) {
      updateData.name = data.name;
    }

    if (data.role && data.role !== user.role) {
      updateData.role = data.role;
    }

    // Only submit if there are changes
    if (Object.keys(updateData).length === 0) {
      toast.info('No changes were made to the user');
      return;
    }

    updateUserMutation.mutate(updateData);
  };

  const isLoading = updateUserMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Edit User</h2>
        <p className="text-muted-foreground">
          Update user information. Leave password blank to keep current password.
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
                <FormLabel>Password (optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="Leave blank to keep current password"
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
              data-testid="update-user-submit"
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" data-testid="loading-spinner" />}
              {isLoading ? 'Updating User...' : 'Update User'}
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
