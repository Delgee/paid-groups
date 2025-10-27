'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BotConfiguration, botConfigurationApi } from '@/lib/api/bot-configurations';
import { PlusIcon, SettingsIcon, RefreshCwIcon, TrashIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function BotConfigurationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [botConfigs, setBotConfigs] = useState<BotConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadBotConfigurations();
  }, []);

  const loadBotConfigurations = async () => {
    try {
      setLoading(true);
      const data = await botConfigurationApi.getAll();
      setBotConfigs(data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to load bot configurations';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (id: string) => {
    try {
      setSyncing(id);
      await botConfigurationApi.sync(id);
      toast.success('Bot synced successfully');
      await loadBotConfigurations();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to sync bot';
      toast.error(errorMessage);
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bot configuration?')) {
      return;
    }

    try {
      await botConfigurationApi.delete(id);
      toast.success('Bot configuration deleted successfully');
      await loadBotConfigurations();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to delete bot configuration';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading bot configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bot Configurations</h1>
          <p className="text-muted-foreground mt-2">
            Manage your Telegram bots and their settings
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/bot-configurations/create')}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Bot
        </Button>
      </div>

      {botConfigs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <SettingsIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bot configurations yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first Telegram bot configuration
            </p>
            <Button onClick={() => router.push('/dashboard/bot-configurations/create')}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Bot Configuration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {botConfigs.map((config) => (
            <Card key={config.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{config.display_name}</CardTitle>
                    <CardDescription className="mt-1">
                      @{config.bot_username}
                    </CardDescription>
                  </div>
                  <Badge variant={config.is_active ? 'default' : 'secondary'}>
                    {config.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {config.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {config.description}
                  </p>
                )}

                {config.channel_username && (
                  <div className="mb-4">
                    <p className="text-sm font-medium">Channel</p>
                    <p className="text-sm text-muted-foreground">@{config.channel_username}</p>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/dashboard/bot-configurations/${config.id}/edit`)}
                  >
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(config.id)}
                    disabled={syncing === config.id}
                  >
                    <RefreshCwIcon className={`h-4 w-4 ${syncing === config.id ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(config.id)}
                  >
                    <TrashIcon className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
