'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Bot, Users, CreditCard, TrendingUp, ArrowUpRight, ArrowDownRight, Plus, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { projectApi, type Project } from '@/lib/api/projects';
import { analyticsApi, type DashboardMetrics, type RevenueMetrics, type MembershipMetrics, type PaymentStats } from '@/lib/api/analytics';
import { PaymentStatsCard } from '@/components/dashboard/PaymentStatsCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { MembershipChart } from '@/components/dashboard/MembershipChart';
import { HealthChecks } from '@/components/dashboard/HealthChecks';
import { QueueStatus } from '@/components/dashboard/QueueStatus';
import { PageHeader } from '@/components/dashboard/PageHeader';

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [membershipMetrics, setMembershipMetrics] = useState<MembershipMetrics | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all dashboard data in parallel
        const [
          projectsResponse,
          dashboardMetricsData,
          revenueMetricsData,
          membershipMetricsData,
          paymentStatsData,
        ] = await Promise.all([
          projectApi.getAll(),
          analyticsApi.getDashboardMetrics().catch(() => null),
          analyticsApi.getRevenueMetrics(30).catch(() => null),
          analyticsApi.getMembershipMetrics().catch(() => null),
          analyticsApi.getPaymentStats().catch(() => null),
        ]);

        setProjects(projectsResponse.data);
        setDashboardMetrics(dashboardMetricsData);
        setRevenueMetrics(revenueMetricsData);
        setMembershipMetrics(membershipMetricsData);
        setPaymentStats(paymentStatsData);

      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Хяналтын самбарын өгөгдлийг ачаалж чадсангүй');
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
          Дахин оролдох
        </Button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Нийт төсөл',
      value: projects.length,
      description: 'Идэвхитэй төслүүд',
      icon: Bot,
      trend: `${projects.filter(p => p.is_active).length} идэвхитэй`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Шилдэг группүүд',
      value: dashboardMetrics?.top_performing_groups.length || 0,
      description: 'Гүйцэтгэлтэй группүүд',
      icon: Users,
      trend: `${dashboardMetrics?.active_members || 0} идэвхитэй гишүүн`,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Сарын орлого',
      value: `${((dashboardMetrics?.monthly_revenue || 0) / 1000).toFixed(0)}K`,
      description: 'Энэ сарын төгрөг',
      icon: TrendingUp,
      trend: `${(revenueMetrics?.growth_percentage || 0).toFixed(1)}% өсөлт`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Идэвхитэй гишүүнчлэл',
      value: membershipMetrics?.active_memberships || 0,
      description: 'Төлбөртэй гишүүнчлэл',
      icon: CreditCard,
      trend: `${membershipMetrics?.trial_memberships || 0} турших`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Сайн байна уу, {user?.name}!
            </h1>
            <p className="mt-2 text-lg text-blue-100">
              Өнөөдрийн Telegram группүүдийн үйл ажиллагаа
            </p>
          </div>
          <div className="hidden md:block">
            <Activity className="h-20 w-20 text-blue-300 opacity-50" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer border-l-4"
            style={{ borderLeftColor: stat.color.replace('text-', '#') }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-3 rounded-xl ${stat.bgColor} shadow-sm`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
              <p className="text-sm text-gray-500 mt-1">
                {stat.description}
              </p>
              <div className="mt-3 flex items-center">
                <span className="text-sm font-medium text-green-600 flex items-center">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
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
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="border-b bg-gradient-to-br from-gray-50 to-white">
            <CardTitle className="flex items-center">
              <Plus className="h-5 w-5 mr-2 text-blue-600" />
              Түргэн үйлдэл
            </CardTitle>
            <CardDescription>
              Түгээмэл үйлдлүүдийг хийх
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            <Button asChild className="w-full h-12 text-base shadow-sm hover:shadow">
              <Link href="/dashboard/projects/create">
                <Bot className="mr-2 h-5 w-5" />
                Шинэ төсөл үүсгэх
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full h-11 hover:bg-gray-50">
              <Link href="/dashboard/members">
                <Users className="mr-2 h-4 w-4" />
                Гишүүдийг харах
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full h-11 hover:bg-gray-50">
              <Link href="/dashboard/plans">
                <CreditCard className="mr-2 h-4 w-4" />
                Багцууд удирдах
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="border-b bg-gradient-to-br from-gray-50 to-white">
            <CardTitle className="flex items-center">
              <Bot className="h-5 w-5 mr-2 text-blue-600" />
              Сүүлийн төслүүд
            </CardTitle>
            <CardDescription>
              Таны сүүлд үүсгэсэн төслүүд
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900">Төсөл байхгүй байна</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Эхний төслөө үүсгээд эхлээрэй.
                </p>
                <div className="mt-6">
                  <Button asChild className="shadow-sm">
                    <Link href="/dashboard/projects/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Төсөл үүсгэх
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 3).map((project, index) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">
                          {project.display_name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          @{project.bot_username || 'Username not available'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        project.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {project.is_active ? 'Идэвхитэй' : 'Идэвхгүй'}
                      </span>
                      <Button asChild variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                        <Link href={`/dashboard/projects/${project.id}`}>
                          Харах
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
                {projects.length > 3 && (
                  <div className="pt-2 mt-4 border-t">
                    <Button asChild variant="outline" size="sm" className="w-full hover:bg-gray-50">
                      <Link href="/dashboard/projects">
                        Бүх төслүүдийг харах ({projects.length})
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
      {paymentStats && (
        <div>
          <div className="flex items-center mb-6">
            <div className="h-8 w-1 bg-blue-600 rounded-full mr-3"></div>
            <h2 className="text-2xl font-bold text-gray-900">Төлбөрийн шинжилгээ</h2>
          </div>
          <PaymentStatsCard stats={paymentStats} />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {revenueMetrics && revenueMetrics.daily_revenue.length > 0 && (
          <RevenueChart
            data={revenueMetrics.daily_revenue.map(item => ({
              date: new Date(item.date).toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' }),
              revenue: item.revenue,
              payments: item.transaction_count,
            }))}
          />
        )}

        {membershipMetrics && (
          <MembershipChart
            data={[
              {
                month: 'Одоогийн',
                active: membershipMetrics.active_memberships,
                new: membershipMetrics.active_memberships,
                expired: membershipMetrics.expired_memberships,
              },
            ]}
          />
        )}
      </div>

      {/* System Status Section */}
      <div>
        <div className="flex items-center mb-6">
          <div className="h-8 w-1 bg-green-600 rounded-full mr-3"></div>
          <h2 className="text-2xl font-bold text-gray-900">Системийн төлөв</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <HealthChecks />
          <QueueStatus />
        </div>
      </div>
    </div>
  );
}
