'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TelegramGroupForm } from 'components/telegram-groups/TelegramGroupForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  telegramGroupsApi,
  telegramGroupsQueryKeys,
  CreateTelegramGroupData,
  UpdateTelegramGroupData,
} from '@/lib/api/telegram-groups';

export default function CreateTelegramGroupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Get project_id from URL params if provided
  const projectIdFromUrl = searchParams.get('project_id');

  // Create mutation - now validates bot permissions and connects channel automatically
  const createMutation = useMutation({
    mutationFn: (data: CreateTelegramGroupData) =>
      telegramGroupsApi.createTelegramGroup(data),
    onSuccess: (newGroup) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: telegramGroupsQueryKeys.all });

      toast.success(`"${newGroup.group_name}" группыг амжилттай үүсгэж, холболоо!`);

      // Redirect to the groups list
      router.push('/dashboard/telegram-groups');
    },
    onError: (error: Error) => {
      // Error messages are now more specific from backend validation
      toast.error(error.message || 'Telegram групп үүсгэхэд алдаа гарлаа');
    },
  });

  const handleCreateSubmit = async (data: CreateTelegramGroupData | UpdateTelegramGroupData) => {
    await createMutation.mutateAsync(data as CreateTelegramGroupData);
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Telegram группүүд руу буцах
        </Button>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Telegram групп үүсгэх</h1>
          <p className="text-muted-foreground">
            Автомат хандалтын удирдлагатай төлбөртэй Telegram групп үүсгэх
          </p>
        </div>
      </div>

      <TelegramGroupForm
        mode="create"
        onSubmit={handleCreateSubmit}
        onCancel={() => router.back()}
        isLoading={createMutation.isPending}
        preselectedProjectId={projectIdFromUrl || undefined}
      />
    </div>
  );
}