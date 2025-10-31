'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Bot, Users, CreditCard, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { projectApi, type Project } from '@/lib/api/projects';
import { PaymentStatsCard } from '@/components/dashboard/PaymentStatsCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { MembershipChart } from '@/components/dashboard/MembershipChart';

interface DashboardStats {
  totalProjects: number;
  totalGroups: number;
  totalMembers: number;
  activeMemberships: number;
  recentActivity: {
    type: 'project_created' | 'group_connected' | 'payment_received' | 'member_joined';
    message: string;
    timestamp: string;
  }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalGroups: 0,
    totalMembers: 0,
    activeMemberships: 0,
    recentActivity: []
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch projects data
        const projectsResponse = await projectApi.getAll();
        setProjects(projectsResponse.data);

        // Calculate stats from projects data
        const totalProjects = projectsResponse.data.length;
        const totalGroups = 0;
        const totalMembers = 0;
        const activeMemberships = 0;

        // TODO: Add stats aggregation when project stats are available
        // projectsResponse.data.forEach(project => {
        //   if (project.stats) {
        //     totalGroups += project.stats.groups_count || 0;
        //     totalMembers += project.stats.members_count || 0;
        //     activeMemberships += project.stats.active_memberships || 0;
        //   }
        // });

        setStats({
          totalProjects,
          totalGroups,
          totalMembers,
          activeMemberships,
          recentActivity: [
            {
              type: 'project_created',
              message: 'New project created successfully',
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
      title: 'Total Projects',
      value: stats.totalProjects,
      description: 'Active projects',
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
              <Link href="/dashboard/projects/create">
                <Bot className="mr-2 h-4 w-4" />
                Create New Project
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

        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>
              Your recently created projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-6">
                <Bot className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No projects yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first project.
                </p>
                <div className="mt-6">
                  <Button asChild>
                    <Link href="/dashboard/projects/create">
                      <Bot className="mr-2 h-4 w-4" />
                      Create Project
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.slice(0, 3).map((project) => (
                  <div key={project.id} className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {project.display_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        @{project.bot_username || 'Username not available'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        project.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {project.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/projects/${project.id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
                {projects.length > 3 && (
                  <div className="pt-2">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href="/dashboard/projects">
                        View all projects ({projects.length})
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Statistics */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Analytics</h2>
        <PaymentStatsCard
          stats={{
            totalRevenue: stats.activeMemberships * 35000, // Mock calculation
            totalPayments: stats.activeMemberships + 10,
            completedPayments: stats.activeMemberships,
            pendingPayments: 5,
            failedPayments: 3,
            averagePayment: 35000,
            revenueGrowth: 12.5
          }}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2 mt-8">
        <RevenueChart
          data={[
            { date: 'Jan 1', revenue: 150000, payments: 15 },
            { date: 'Jan 5', revenue: 280000, payments: 28 },
            { date: 'Jan 10', revenue: 420000, payments: 42 },
            { date: 'Jan 15', revenue: 560000, payments: 56 },
            { date: 'Jan 20', revenue: 700000, payments: 70 },
            { date: 'Jan 25', revenue: 850000, payments: 85 },
            { date: 'Jan 30', revenue: 1000000, payments: 100 },
          ]}
        />

        <MembershipChart
          data={[
            { month: 'Oct', active: 85, new: 20, expired: 5 },
            { month: 'Nov', active: 100, new: 25, expired: 10 },
            { month: 'Dec', active: 115, new: 30, expired: 15 },
            { month: 'Jan', active: 130, new: 35, expired: 20 },
          ]}
        />
      </div>
    </div>
  );
}