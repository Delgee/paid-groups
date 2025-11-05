'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { PaymentStatsCard } from '@/components/dashboard/PaymentStatsCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { MembershipChart } from '@/components/dashboard/MembershipChart';

interface DashboardMetrics {
  active_members: number;
  total_revenue: number;
  monthly_revenue: number;
  churn_rate: number;
  trial_conversion_rate: number;
  top_performing_groups: {
    group_id: string;
    group_name: string;
    member_count: number;
    revenue: number;
    conversion_rate: number;
  }[];
}

interface RevenueMetrics {
  current_period: number;
  previous_period: number;
  growth_percentage: number;
  mrr: number;
  arr: number;
  daily_revenue: {
    date: string;
    revenue: number;
    transaction_count: number;
  }[];
}

interface MembershipMetrics {
  total_memberships: number;
  active_memberships: number;
  trial_memberships: number;
  expired_memberships: number;
  churn_rate: number;
  average_lifetime_value: number;
}

interface PaymentStats {
  totalRevenue: number;
  totalPayments: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  averagePayment: number;
  revenueGrowth: number;
}

export default function AnalyticsPage() {
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [membershipMetrics, setMembershipMetrics] = useState<MembershipMetrics | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<number>(30);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [dashboard, revenue, membership, payments] = await Promise.all([
        apiClient.getDashboardMetrics(),
        apiClient.getRevenueMetrics(timeRange),
        apiClient.getMembershipMetrics(),
        apiClient.getPaymentStats(),
      ]);

      setDashboardMetrics(dashboard);
      setRevenueMetrics(revenue);
      setMembershipMetrics(membership);
      setPaymentStats(payments);
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mn-MN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ₮';
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Track your business performance and metrics</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Track your business performance and metrics</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="text-red-600 text-lg font-medium mb-4">
                {error}
              </div>
              <button
                onClick={fetchAnalytics}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Track your business performance and metrics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange(7)}
            className={`px-4 py-2 rounded-md ${
              timeRange === 7
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange(30)}
            className={`px-4 py-2 rounded-md ${
              timeRange === 30
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange(90)}
            className={`px-4 py-2 rounded-md ${
              timeRange === 90
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardMetrics?.total_revenue || 0)}
            </div>
            {revenueMetrics && (
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {revenueMetrics.growth_percentage >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600 mr-1" />
                )}
                <span className={revenueMetrics.growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatPercentage(revenueMetrics.growth_percentage)}
                </span>
                <span className="ml-1">from last period</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardMetrics?.active_members || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently subscribed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(revenueMetrics?.mrr || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              MRR (Monthly Recurring Revenue)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(dashboardMetrics?.churn_rate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Monthly churn
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="memberships">Memberships</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          {revenueMetrics && revenueMetrics.daily_revenue.length > 0 ? (
            <RevenueChart
              data={revenueMetrics.daily_revenue.map(day => ({
                date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue: day.revenue,
                payments: day.transaction_count,
              }))}
              title="Revenue Overview"
              description={`Daily revenue and transaction volume over the last ${timeRange} days`}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>
                  No revenue data available for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[350px] flex items-center justify-center text-muted-foreground">
                No data to display
              </CardContent>
            </Card>
          )}

          {/* ARR Card */}
          <Card>
            <CardHeader>
              <CardTitle>Annual Recurring Revenue</CardTitle>
              <CardDescription>
                Projected annual revenue based on current subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(revenueMetrics?.arr || 0)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memberships" className="space-y-4">
          {membershipMetrics ? (
            <MembershipChart
              data={[
                {
                  month: 'Current',
                  active: membershipMetrics.active_memberships,
                  expired: membershipMetrics.expired_memberships,
                  new: membershipMetrics.trial_memberships,
                },
              ]}
              title="Membership Status"
              description="Current membership distribution by status"
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Membership Growth</CardTitle>
                <CardDescription>
                  No membership data available
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[350px] flex items-center justify-center text-muted-foreground">
                No data to display
              </CardContent>
            </Card>
          )}

          {/* Membership Stats */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Memberships</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {membershipMetrics?.total_memberships || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Trial Conversions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(dashboardMetrics?.trial_conversion_rate || 0).toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Avg Lifetime Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(membershipMetrics?.average_lifetime_value || 0)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentStatsCard stats={paymentStats || undefined} />
        </TabsContent>
      </Tabs>

      {/* Top Performing Groups */}
      {dashboardMetrics && dashboardMetrics.top_performing_groups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Groups</CardTitle>
            <CardDescription>
              Groups with highest revenue and member engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardMetrics.top_performing_groups.map((group) => (
                <div
                  key={group.group_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <h4 className="font-medium">{group.group_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {group.member_count} members
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(group.revenue)}</div>
                    <p className="text-sm text-muted-foreground">
                      {group.conversion_rate.toFixed(1)}% conversion
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
