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
      const roleMap: Record<string, string> = { admin: 'Админ', moderator: 'Модератор', owner: 'Эзэмшигч' };
      toast.success(`${roleMap[data.role] || data.role} хэрэглэгч ${data.name} амжилттай үүсгэлээ`);

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
          message: 'Энэ имэйл хаягтай хэрэглэгч аль хэдийн бүртгэлтэй байна',
        });
        toast.error('Энэ имэйл хаягтай хэрэглэгч аль хэдийн бүртгэлтэй байна');
      } else if (error.isForbidden) {
        toast.error('Зөвхөн эзэмшигч админ болон модератор үүсгэх эрхтэй');
      } else {
        toast.error(error.message || 'Тодорхойгүй алдаа гарлаа');
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
        <h2 className="text-2xl font-bold tracking-tight">Шинэ хэрэглэгч нэмэх</h2>
        <p className="text-muted-foreground">
          Байгууллагадаа шинэ админ эсвэл модератор нэмэх.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Имэйл хаяг</FormLabel>
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
                <FormLabel>Нууц үг</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="Нууц үг оруулах"
                    data-testid="user-password-input"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage data-testid="password-error" />
                <p className="text-sm text-muted-foreground">
                  Дор хаяж 8 тэмдэгт, том үсэг, жижиг үсэг, тоо агуулсан байх ёстой
                </p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Овог нэр</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Овог нэр"
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
                <FormLabel>Эрх</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  data-testid="user-role-select"
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger data-testid="user-role-select-trigger">
                      <SelectValue placeholder="Эрх сонгох" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="admin">Админ</SelectItem>
                    <SelectItem value="moderator">Модератор</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage data-testid="role-error" />
                <p className="text-sm text-muted-foreground">
                  Админ: Бот, групп, тайлан бүгдэд нэвтрэх эрхтэй. Модератор: Зөвхөн групп болон гишүүнчлэл удирдах эрхтэй.
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
              {isLoading ? 'Үүсгэж байна...' : 'Хэрэглэгч үүсгэх'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                data-testid="cancel-button"
              >
                Цуцлах
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}