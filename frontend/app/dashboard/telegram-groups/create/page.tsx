'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TelegramGroupForm } from 'components/telegram-groups/TelegramGroupForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  telegramGroupsApi,
  telegramGroupsQueryKeys,
  CreateTelegramGroupData
} from '@/lib/api/telegram-groups';

export default function CreateTelegramGroupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateTelegramGroupData) =>
      telegramGroupsApi.createTelegramGroup(data),
    onSuccess: (createdGroup) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: telegramGroupsQueryKeys.all });

      toast.success(`Telegram group "${createdGroup.group_name}" created successfully!`);
      router.push('/dashboard/telegram-groups');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create telegram group: ${error.message}`);
    },
  });

  const handleSubmit = async (data: CreateTelegramGroupData) => {
    await createMutation.mutateAsync(data);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={handleCancel} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Telegram Groups
        </Button>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Create Telegram Group</h1>
          <p className="text-muted-foreground">
            Set up a new paid Telegram group with automated access management
          </p>
        </div>
      </div>

      <TelegramGroupForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}