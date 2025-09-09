'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Bot, 
  Users, 
  MessageCircle, 
  Settings, 
  Plus,
  ExternalLink,
  Copy,
  CheckCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { Bot as BotType, TelegramGroup } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Remove unused import

// Create a simple Badge component since it's not in our UI library yet
function SimpleBadge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

export default function BotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params.id as string;

  const [bot, setBot] = useState<BotType | null>(null);
  const [groups, setGroups] = useState<TelegramGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    const fetchBotData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [botResponse, groupsResponse] = await Promise.all([
          apiClient.getBot(botId),
          apiClient.getBotGroups(botId)
        ]);

        setBot(botResponse);
        setGroups(groupsResponse.groups);
      } catch (err: any) {
        console.error('Failed to fetch bot data:', err);
        setError(err?.response?.status === 404 ? 'Bot not found' : 'Failed to load bot data');
      } finally {
        setIsLoading(false);
      }
    };

    if (botId) {
      fetchBotData();
    }
  }, [botId]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-gray-200 rounded-lg h-64"></div>
            <div className="bg-gray-200 rounded-lg h-64"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !bot) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg font-medium mb-4">
          {error || 'Bot not found'}
        </div>
        <Button onClick={() => router.push('/dashboard/bots')}>
          Back to Bots
        </Button>
      </div>
    );
  }

  const maskedToken = `${bot.bot_token.split(':')[0]}:${'*'.repeat(20)}...`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/bots">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bots
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bot className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{bot.bot_name}</h1>
              <p className="text-gray-600">
                @{bot.bot_username || 'Username not available'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/bots/${bot.id}/settings`}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/bots/${bot.id}/groups/connect`}>
              <Plus className="h-4 w-4 mr-2" />
              Connect Group
            </Link>
          </Button>
        </div>
      </div>

      {/* Status and Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <SimpleBadge variant={bot.is_active ? 'success' : 'warning'}>
              {bot.is_active ? 'Active' : 'Inactive'}
            </SimpleBadge>
            <p className="text-xs text-muted-foreground mt-1">
              {bot.is_active ? 'Bot is running' : 'Bot is paused'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bot.stats?.groups_count || groups.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Telegram groups
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bot.stats?.members_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all groups
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Memberships</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bot.stats?.active_memberships || 0}</div>
            <p className="text-xs text-muted-foreground">
              Paid members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bot Details and Groups */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bot Information */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Bot Information</CardTitle>
              <CardDescription>
                Basic details about your bot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Bot Name</label>
                <p className="text-sm">{bot.bot_name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Username</label>
                <p className="text-sm">
                  @{bot.bot_username || 'Not available'}
                  {bot.bot_username && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-auto p-1"
                      onClick={() => window.open(`https://t.me/${bot.bot_username}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Bot Token</label>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1">
                    {maskedToken}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1"
                    onClick={() => copyToClipboard(bot.bot_token)}
                  >
                    {copiedToken ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm">
                  {new Date(bot.created_at).toLocaleDateString()}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm">
                  {new Date(bot.updated_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connected Groups */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Connected Groups</CardTitle>
                <CardDescription>
                  Telegram groups managed by this bot
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href={`/dashboard/bots/${bot.id}/groups/connect`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Group
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {groups.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No groups connected</h3>
                  <p className="text-gray-500 mb-4">
                    Connect your first Telegram group to start managing paid memberships.
                  </p>
                  <Button asChild>
                    <Link href={`/dashboard/bots/${bot.id}/groups/connect`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Connect First Group
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {groups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{group.group_name}</h4>
                        <p className="text-sm text-gray-500">
                          {group.group_type} • {group.member_count} members
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <SimpleBadge variant={group.is_active ? 'success' : 'warning'}>
                          {group.is_active ? 'Active' : 'Inactive'}
                        </SimpleBadge>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/groups/${group.id}`}>
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for managing this bot
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Button variant="outline" className="justify-start" asChild>
            <Link href={`/dashboard/bots/${bot.id}/groups/connect`}>
              <Plus className="mr-2 h-4 w-4" />
              Connect New Group
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link href={`/dashboard/bots/${bot.id}/messages`}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Manage Messages
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link href={`/dashboard/bots/${bot.id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Bot Settings
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}