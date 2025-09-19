'use client';

import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TelegramGroupForm } from 'components/telegram-groups/TelegramGroupForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  telegramGroupsApi,
  telegramGroupsQueryKeys,
  UpdateTelegramGroupData
} from '@/lib/api/telegram-groups';

interface EditTelegramGroupPageProps {
  params: {
    id: string;
  };
}

export default function EditTelegramGroupPage({ params }: EditTelegramGroupPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = params;

  // Fetch the telegram group data
  const {
    data: telegramGroup,
    isLoading,
    error,
    isError
  } = useQuery({
    queryKey: telegramGroupsQueryKeys.detail(id),
    queryFn: () => telegramGroupsApi.getTelegramGroup(id),
    retry: (failureCount, error) => {
      // Don't retry on 404 errors
      if (error?.message?.includes('404') || error?.message?.toLowerCase().includes('not found')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateTelegramGroupData) =>
      telegramGroupsApi.updateTelegramGroup(id, data),
    onSuccess: (updatedGroup) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: telegramGroupsQueryKeys.all });
      queryClient.setQueryData(telegramGroupsQueryKeys.detail(id), updatedGroup);

      toast.success(`Telegram group "${updatedGroup.group_name}" updated successfully!`);
      router.push('/dashboard/telegram-groups');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update telegram group: ${error.message}`);
    },
  });

  const handleSubmit = async (data: UpdateTelegramGroupData) => {
    await updateMutation.mutateAsync(data);
  };

  const handleCancel = () => {
    router.back();
  };

  // Handle 404 - group not found
  if (isError && error?.message?.includes('404') || error?.message?.toLowerCase().includes('not found')) {
    notFound();
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={handleCancel} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Telegram Groups
          </Button>

          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Edit Telegram Group</h1>
            <p className="text-muted-foreground">Loading group details...</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading telegram group...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state (non-404 errors)
  if (isError && telegramGroup === undefined) {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={handleCancel} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Telegram Groups
          </Button>

          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-destructive">Error Loading Group</h1>
            <p className="text-muted-foreground">
              Failed to load the telegram group details
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-destructive">
                {error?.message || 'An unexpected error occurred'}
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard/telegram-groups')}>
                  Back to Groups
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - show the form
  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={handleCancel} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Telegram Groups
        </Button>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Edit Telegram Group</h1>
          <p className="text-muted-foreground">
            Update settings and configuration for "{telegramGroup?.group_name}"
          </p>
        </div>
      </div>

      <TelegramGroupForm
        mode="edit"
        initialData={telegramGroup}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}