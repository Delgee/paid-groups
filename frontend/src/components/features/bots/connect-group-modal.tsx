'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, ExternalLink, Info } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const connectGroupSchema = z.object({
  telegram_chat_id: z.number({
    required_error: 'Chat ID is required',
    invalid_type_error: 'Chat ID must be a number',
  }).int('Chat ID must be an integer'),
  group_name: z.string().min(1, 'Group name is required')
    .max(128, 'Group name must be less than 128 characters'),
  group_type: z.enum(['channel', 'group', 'supergroup'], {
    required_error: 'Please select a group type',
  }),
});

type ConnectGroupFormData = z.infer<typeof connectGroupSchema>;

interface ConnectGroupModalProps {
  botId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ConnectGroupModal({ 
  botId, 
  isOpen, 
  onClose, 
  onSuccess 
}: ConnectGroupModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    // watch,
    reset,
  } = useForm<ConnectGroupFormData>({
    resolver: zodResolver(connectGroupSchema),
  });

  // const groupType = watch('group_type');

  const onSubmit = async (data: ConnectGroupFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await apiClient.connectGroup(botId, data);
      
      reset();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to connect group';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      reset();
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Connect Telegram Group
          </DialogTitle>
          <DialogDescription>
            Add a Telegram group for your bot to manage paid memberships.
            Make sure to add your bot as an administrator first.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">Before connecting your group:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Add your bot to the Telegram group as an administrator</li>
                  <li>Give the bot permission to manage users and messages</li>
                  <li>Get the group&apos;s Chat ID (see instructions below)</li>
                </ol>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="group_name">Group Name</Label>
            <Input
              id="group_name"
              type="text"
              placeholder="My Paid Group"
              {...register('group_name')}
              className={errors.group_name ? 'border-red-500' : ''}
            />
            {errors.group_name && (
              <p className="text-red-600 text-sm">{errors.group_name.message}</p>
            )}
            <p className="text-xs text-gray-500">
              A friendly name to identify this group in your dashboard
            </p>
          </div>

          {/* Group Type */}
          <div className="space-y-2">
            <Label>Group Type</Label>
            <Select onValueChange={(value) => setValue('group_type', value as 'channel' | 'group' | 'supergroup')}>
              <SelectTrigger className={errors.group_type ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select group type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="group">Group</SelectItem>
                <SelectItem value="supergroup">Supergroup</SelectItem>
                <SelectItem value="channel">Channel</SelectItem>
              </SelectContent>
            </Select>
            {errors.group_type && (
              <p className="text-red-600 text-sm">{errors.group_type.message}</p>
            )}
            <p className="text-xs text-gray-500">
              The type of Telegram group (most paid groups are Supergroups)
            </p>
          </div>

          {/* Chat ID */}
          <div className="space-y-2">
            <Label htmlFor="telegram_chat_id">Telegram Chat ID</Label>
            <Input
              id="telegram_chat_id"
              type="text"
              placeholder="-1001234567890"
              {...register('telegram_chat_id', {
                setValueAs: (value) => value === '' ? undefined : parseInt(value, 10)
              })}
              className={errors.telegram_chat_id ? 'border-red-500' : ''}
            />
            {errors.telegram_chat_id && (
              <p className="text-red-600 text-sm">{errors.telegram_chat_id.message}</p>
            )}
            <div className="text-xs text-gray-500 space-y-1">
              <p>The unique identifier for your Telegram group (usually starts with -100)</p>
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">How to find Chat ID?</summary>
                <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                  <p><strong>Method 1:</strong> Use @userinfobot</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Add @userinfobot to your group</li>
                    <li>Send any message in the group</li>
                    <li>The bot will reply with the Chat ID</li>
                  </ol>
                  
                  <p><strong>Method 2:</strong> Use @getidsbot</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Forward any message from your group to @getidsbot</li>
                    <li>The bot will reply with group information including Chat ID</li>
                  </ol>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-xs"
                    onClick={() => window.open('https://t.me/userinfobot', '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open @userinfobot
                  </Button>
                </div>
              </details>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-amber-600">⚠️</div>
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Security Notice</p>
                <p>
                  Only connect groups that you own or have explicit permission to manage.
                  Your bot will have administrator access to manage members and messages.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Connect Group
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}