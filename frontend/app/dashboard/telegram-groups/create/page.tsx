'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TelegramGroupForm } from 'components/telegram-groups/TelegramGroupForm';
import { ChannelConnectionForm } from 'components/telegram-groups/ChannelConnectionForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  telegramGroupsApi,
  telegramGroupsQueryKeys,
  CreateTelegramGroupData,
  UpdateTelegramGroupData,
  ConnectChannelData,
  TelegramGroup,
} from '@/lib/api/telegram-groups';

type WizardStep = 'create' | 'connect' | 'complete';

export default function CreateTelegramGroupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<WizardStep>('create');
  const [createdGroup, setCreatedGroup] = useState<TelegramGroup | null>(null);

  // Get project_id from URL params if provided
  const projectIdFromUrl = searchParams.get('project_id');

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateTelegramGroupData) =>
      telegramGroupsApi.createTelegramGroup(data),
    onSuccess: (newGroup) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: telegramGroupsQueryKeys.all });

      setCreatedGroup(newGroup);
      setCurrentStep('connect');
      toast.success(`Telegram group "${newGroup.group_name}" created successfully!`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create telegram group: ${error.message}`);
    },
  });

  // Connect channel mutation
  const connectMutation = useMutation({
    mutationFn: (data: { groupId: string; connectData: ConnectChannelData }) =>
      telegramGroupsApi.connectChannel(data.groupId, data.connectData),
    onSuccess: (response) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: telegramGroupsQueryKeys.all });

      if (response.success) {
        toast.success(`Successfully connected to channel "${response.channel_info.title}"!`);
        router.push('/dashboard/telegram-groups');
      } else {
        toast.error(`Connection failed: ${response.message}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to connect channel: ${error.message}`);
    },
  });

  const handleCreateSubmit = async (data: CreateTelegramGroupData | UpdateTelegramGroupData) => {
    await createMutation.mutateAsync(data as CreateTelegramGroupData);
  };

  const handleConnectSubmit = async (data: ConnectChannelData) => {
    if (!createdGroup) {
      toast.error('No group created yet');
      return;
    }

    await connectMutation.mutateAsync({
      groupId: createdGroup.id,
      connectData: data,
    });
  };

  const handleSkipConnection = () => {
    toast.info('You can connect your channel later from the group details page.');
    router.push('/dashboard/telegram-groups');
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      <div className="flex items-center">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            currentStep === 'create'
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-green-600 bg-green-600 text-white'
          }`}
        >
          {currentStep === 'create' ? '1' : <CheckCircle className="h-5 w-5" />}
        </div>
        <span className="ml-2 text-sm font-medium">Create Group</span>
      </div>

      <div className="h-px w-12 bg-gray-300" />

      <div className="flex items-center">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            currentStep === 'connect'
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-gray-300 bg-white text-gray-400'
          }`}
        >
          2
        </div>
        <span
          className={`ml-2 text-sm font-medium ${
            currentStep === 'connect' ? 'text-foreground' : 'text-muted-foreground'
          }`}
        >
          Connect Channel
        </span>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Telegram Groups
        </Button>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Create Telegram Group</h1>
          <p className="text-muted-foreground">
            {currentStep === 'create'
              ? 'Set up a new paid Telegram group with automated access management'
              : 'Connect your Telegram channel to enable member synchronization'
            }
          </p>
        </div>
      </div>

      {renderStepIndicator()}

      {currentStep === 'create' && (
        <TelegramGroupForm
          mode="create"
          onSubmit={handleCreateSubmit}
          onCancel={() => router.back()}
          isLoading={createMutation.isPending}
          preselectedProjectId={projectIdFromUrl || undefined}
        />
      )}

      {currentStep === 'connect' && createdGroup && (
        <div className="space-y-6">
          <ChannelConnectionForm
            group={createdGroup}
            onSubmit={handleConnectSubmit}
            isLoading={connectMutation.isPending}
          />

          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={handleSkipConnection}
              disabled={connectMutation.isPending}
              data-testid="skip-connection-button"
            >
              Skip for now (connect later)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}