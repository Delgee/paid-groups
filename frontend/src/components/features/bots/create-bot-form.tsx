'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bot, ExternalLink } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const createBotSchema = z.object({
  bot_token: z.string().min(1, 'Bot token is required')
    .regex(/^\d+:[A-Za-z0-9_-]+$/, 'Invalid bot token format'),
  bot_name: z.string().min(2, 'Bot name must be at least 2 characters')
    .max(64, 'Bot name must be less than 64 characters'),
});

type CreateBotFormData = z.infer<typeof createBotSchema>;

interface CreateBotFormProps {
  onSuccess?: (botId: string) => void;
  onCancel?: () => void;
}

export default function CreateBotForm({ onSuccess, onCancel }: CreateBotFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateBotFormData>({
    resolver: zodResolver(createBotSchema),
  });

  const botToken = watch('bot_token');
  const isValidTokenFormat = botToken && /^\d+:[A-Za-z0-9_-]+$/.test(botToken);

  const onSubmit = async (data: CreateBotFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const bot = await apiClient.createBot(data);
      
      if (onSuccess) {
        onSuccess(bot.id);
      } else {
        router.push(`/dashboard/bots/${bot.id}`);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to create bot';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            How to Create a Telegram Bot
          </CardTitle>
          <CardDescription>
            Follow these steps to create a new bot with @BotFather
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                1
              </span>
              <div>
                <p className="font-medium">Open Telegram and search for @BotFather</p>
                <p className="text-gray-600">Start a chat with the official BotFather bot</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                2
              </span>
              <div>
                <p className="font-medium">Send <code className="bg-gray-100 px-1 rounded">/newbot</code> command</p>
                <p className="text-gray-600">Follow the prompts to create your bot</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                3
              </span>
              <div>
                <p className="font-medium">Copy the bot token</p>
                <p className="text-gray-600">BotFather will give you a token that looks like <code className="bg-gray-100 px-1 rounded">123456789:ABCdefGHIjklMNOpqrSTUvwxyz</code></p>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://t.me/botfather', '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open @BotFather
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Bot Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Your Bot</CardTitle>
          <CardDescription>
            Enter your bot details to connect it to the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="bot_name">Bot Name</Label>
              <Input
                id="bot_name"
                type="text"
                placeholder="My Awesome Bot"
                {...register('bot_name')}
                className={errors.bot_name ? 'border-red-500' : ''}
              />
              {errors.bot_name && (
                <p className="text-red-600 text-sm">{errors.bot_name.message}</p>
              )}
              <p className="text-xs text-gray-500">
                A friendly name for your bot (this can be changed later)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bot_token">Bot Token</Label>
              <Input
                id="bot_token"
                type="text"
                placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxyz"
                {...register('bot_token')}
                className={errors.bot_token ? 'border-red-500' : ''}
              />
              {errors.bot_token && (
                <p className="text-red-600 text-sm">{errors.bot_token.message}</p>
              )}
              {botToken && !isValidTokenFormat && (
                <p className="text-amber-600 text-sm">
                  Token format should be: number:alphanumeric_string
                </p>
              )}
              {isValidTokenFormat && (
                <p className="text-green-600 text-sm">
                  ✓ Token format looks correct
                </p>
              )}
              <p className="text-xs text-gray-500">
                The token you received from @BotFather (keep this secret!)
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start">
                <div className="text-blue-600 mr-3 mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Keep your bot token secure</p>
                  <p>
                    Your bot token is like a password. Don&apos;t share it publicly or commit it to version control.
                    We store it securely and only use it to manage your bot.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading || !isValidTokenFormat}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Bot...
                  </>
                ) : (
                  <>
                    <Bot className="mr-2 h-4 w-4" />
                    Create Bot
                  </>
                )}
              </Button>
              
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Additional Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Pro Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-blue-600">💡</span>
            <p>
              <strong>Bot Username:</strong> Choose a memorable username ending in &quot;bot&quot; 
              (e.g., @mypaidgroupbot)
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-600">💡</span>
            <p>
              <strong>Bot Description:</strong> Add a description with /setdescription 
              to help users understand what your bot does
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-600">💡</span>
            <p>
              <strong>Bot Commands:</strong> After creating your bot, we&apos;ll help you set up 
              commands for member management
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}