'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, Plus, MoreHorizontal, Users, MessageCircle } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { apiClient } from '@/lib/api/client';
import type { Bot as BotType } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function BotsPage() {
  const { user } = useAuth();
  const [bots, setBots] = useState<BotType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBots = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.getBots();
        setBots(response.bots);
      } catch (err) {
        console.error('Failed to fetch bots:', err);
        setError('Failed to load bots');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchBots();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bots</h1>
            <p className="text-gray-600">Manage your Telegram bots</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg font-medium mb-4">
          {error}
        </div>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bots</h1>
          <p className="text-gray-600">Manage your Telegram bots and their settings</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/bots/create">
            <Plus className="mr-2 h-4 w-4" />
            Add Bot
          </Link>
        </Button>
      </div>

      {/* Bots Grid */}
      {bots.length === 0 ? (
        <Card className="col-span-full">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bot className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bots yet</h3>
            <p className="text-gray-500 text-center mb-6 max-w-md">
              Get started by creating your first Telegram bot. Connect it to your groups
              and start managing paid memberships.
            </p>
            <Button asChild>
              <Link href="/dashboard/bots/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Bot
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <Card key={bot.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Bot className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{bot.bot_name}</CardTitle>
                    <CardDescription className="text-sm">
                      @{bot.bot_username || 'Username not available'}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/bots/${bot.id}`}>
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/bots/${bot.id}/settings`}>
                        Settings
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      bot.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {bot.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Stats */}
                  {bot.stats && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Users className="h-4 w-4 text-gray-400 mr-1" />
                        </div>
                        <div className="text-sm font-medium">{bot.stats.groups_count || 0}</div>
                        <div className="text-xs text-gray-500">Groups</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <MessageCircle className="h-4 w-4 text-gray-400 mr-1" />
                        </div>
                        <div className="text-sm font-medium">{bot.stats.members_count || 0}</div>
                        <div className="text-xs text-gray-500">Members</div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    <Button asChild size="sm" className="w-full">
                      <Link href={`/dashboard/bots/${bot.id}`}>
                        View Details
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link href={`/dashboard/bots/${bot.id}/groups`}>
                        Manage Groups
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {bots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks for managing your bots
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/dashboard/bots/create">
                <Plus className="mr-2 h-4 w-4" />
                Add New Bot
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/dashboard/members">
                <Users className="mr-2 h-4 w-4" />
                View All Members
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/dashboard/analytics">
                <MessageCircle className="mr-2 h-4 w-4" />
                View Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}