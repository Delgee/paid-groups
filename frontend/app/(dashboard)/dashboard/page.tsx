'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Bot, Users, CreditCard, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import type { Bot as BotType } from '@/lib/api/client';

interface DashboardStats {
  totalBots: number;
  totalGroups: number;
  totalMembers: number;
  activeMemberships: number;
  recentActivity: {
    type: 'bot_created' | 'group_connected' | 'payment_received' | 'member_joined';
    message: string;
    timestamp: string;
  }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBots: 0,
    totalGroups: 0,
    totalMembers: 0,
    activeMemberships: 0,
    recentActivity: []
  });
  const [bots, setBots] = useState<BotType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch bots data
        const botsResponse = await apiClient.getBots();
        setBots(botsResponse.bots);

        // Calculate stats from bots data
        const totalBots = botsResponse.bots.length;
        let totalGroups = 0;
        let totalMembers = 0;
        let activeMemberships = 0;

        // If bots have stats, aggregate them
        botsResponse.bots.forEach(bot => {
          if (bot.stats) {
            totalGroups += bot.stats.groups_count || 0;
            totalMembers += bot.stats.members_count || 0;
            activeMemberships += bot.stats.active_memberships || 0;
          }
        });

        setStats({
          totalBots,
          totalGroups,
          totalMembers,
          activeMemberships,
          recentActivity: [
            {
              type: 'bot_created',
              message: 'New bot created successfully',
              timestamp: new Date().toISOString(),
            }
          ]
        });

      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
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

  const statCards = [
    {
      title: 'Total Bots',
      value: stats.totalBots,
      description: 'Active Telegram bots',
      icon: Bot,
      trend: '+2 from last month',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Connected Groups',
      value: stats.totalGroups,
      description: 'Telegram groups managed',
      icon: Users,
      trend: '+5 from last month',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Members',
      value: stats.totalMembers,
      description: 'Across all groups',
      icon: TrendingUp,
      trend: '+12% from last month',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Active Memberships',
      value: stats.activeMemberships,
      description: 'Paid memberships',
      icon: CreditCard,
      trend: '+8% from last month',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Here&apos;s what&apos;s happening with your Telegram groups today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
              <div className="mt-2">
                <span className="text-xs text-green-600">
                  {stat.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Get started with common tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/dashboard/bots">
                <Bot className="mr-2 h-4 w-4" />
                Create New Bot
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/members">
                <Users className="mr-2 h-4 w-4" />
                View Members
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/plans">
                <CreditCard className="mr-2 h-4 w-4" />
                Manage Plans
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Bots */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bots</CardTitle>
            <CardDescription>
              Your recently created bots
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bots.length === 0 ? (
              <div className="text-center py-6">
                <Bot className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No bots yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first Telegram bot.
                </p>
                <div className="mt-6">
                  <Button asChild>
                    <Link href="/dashboard/bots">
                      <Bot className="mr-2 h-4 w-4" />
                      Create Bot
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {bots.slice(0, 3).map((bot) => (
                  <div key={bot.id} className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {bot.bot_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        @{bot.bot_username || 'Username not available'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        bot.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {bot.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/bots/${bot.id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
                {bots.length > 3 && (
                  <div className="pt-2">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href="/dashboard/bots">
                        View all bots ({bots.length})
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}