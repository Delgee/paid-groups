'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi, type RevenueStats } from '@/lib/api/admin';
import { DollarSign, TrendingUp, CreditCard, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function RevenueAnalyticsPage() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number>(30);

  useEffect(() => {
    fetchRevenueStats();
  }, [selectedDays]);

  async function fetchRevenueStats() {
    try {
      setIsLoading(true);
      const data = await adminApi.getRevenueStats(selectedDays);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch revenue stats:', err);
      setError('Failed to load revenue data');
    } finally {
      setIsLoading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('mn-MN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg font-medium mb-4">
          {error || 'Failed to load data'}
        </div>
        <Button onClick={fetchRevenueStats}>Retry</Button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `${formatCurrency(stats.total_revenue)} MNT`,
      description: `Last ${selectedDays} days`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Monthly Revenue',
      value: `${formatCurrency(stats.monthly_revenue)} MNT`,
      description: 'Last 30 days',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Yearly Revenue',
      value: `${formatCurrency(stats.yearly_revenue)} MNT`,
      description: 'Last 365 days',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Average Transaction',
      value: `${formatCurrency(stats.average_transaction)} MNT`,
      description: 'Per payment',
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  // Calculate max revenue for chart scaling
  const maxRevenue = Math.max(...stats.payment_trends.map((t) => t.revenue), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Revenue Analytics</h1>
          <p className="mt-2 text-lg text-gray-600">
            Track platform revenue and payment trends
          </p>
        </div>
        <div className="w-48">
          <Select value={selectedDays.toString()} onValueChange={(val) => setSelectedDays(Number(val))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 180 days</SelectItem>
              <SelectItem value="365">Last 365 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trends</CardTitle>
          <CardDescription>
            Daily revenue over the last {selectedDays} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.payment_trends.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No payment data available for the selected period
            </div>
          ) : (
            <div className="space-y-6">
              {/* Simple Bar Chart */}
              <div className="space-y-2">
                {stats.payment_trends.map((trend) => (
                  <div key={trend.date} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 font-medium w-24">
                        {formatDate(trend.date)}
                      </span>
                      <span className="text-gray-900 font-semibold flex-1 text-right mr-4">
                        {formatCurrency(trend.revenue)} MNT
                      </span>
                      <span className="text-gray-500 text-xs w-20 text-right">
                        {trend.payment_count} {trend.payment_count === 1 ? 'payment' : 'payments'}
                      </span>
                    </div>
                    <div className="h-8 bg-gray-100 rounded-md overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                        style={{
                          width: `${(trend.revenue / maxRevenue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="border-t pt-4 mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.payment_trends.length}
                    </div>
                    <div className="text-sm text-gray-600">Days with Revenue</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(
                        stats.payment_trends.reduce((sum, t) => sum + t.revenue, 0)
                      )} MNT
                    </div>
                    <div className="text-sm text-gray-600">Total Period Revenue</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.payment_trends.reduce((sum, t) => sum + t.payment_count, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total Payments</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
