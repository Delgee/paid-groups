'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi, type SystemStats, type TenantActivity } from '@/lib/api/admin';
import {
  Building2,
  Users,
  Wallet,
  TrendingUp,
  Activity,
  CheckCircle,
  XCircle,
  DollarSign,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminHomePage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [tenantActivity, setTenantActivity] = useState<TenantActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [statsData, activityData] = await Promise.all([
          adminApi.getSystemStats(),
          adminApi.getTenantActivity(5),
        ]);
        setStats(statsData);
        setTenantActivity(activityData);
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg font-medium mb-4">
          {error || 'Failed to load data'}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Tenants',
      value: stats.total_tenants,
      description: `${stats.active_tenants} active, ${stats.suspended_tenants} suspended`,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Users',
      value: stats.total_users,
      description: 'Platform users',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Revenue',
      value: `${(stats.total_revenue / 1000000).toFixed(1)}M`,
      description: `${stats.successful_payments} successful payments`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Active Projects',
      value: stats.active_projects,
      description: `${stats.total_projects} total projects`,
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Overview</h1>
        <p className="mt-2 text-lg text-gray-600">
          Platform-wide statistics and tenant activity
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
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Memberships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-lg font-semibold">{stats.total_memberships}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active</span>
                <span className="text-lg font-semibold text-green-600">
                  {stats.active_memberships}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Inactive</span>
                <span className="text-lg font-semibold text-gray-400">
                  {stats.total_memberships - stats.active_memberships}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{stats.total_members}</div>
            <p className="text-sm text-gray-600">
              Total platform members across all tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Payment Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {stats.total_payments > 0
                ? ((stats.successful_payments / stats.total_payments) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-sm text-gray-600">
              {stats.successful_payments} of {stats.total_payments} payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tenant Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tenant Activity</CardTitle>
          <CardDescription>Most recently active tenants</CardDescription>
        </CardHeader>
        <CardContent>
          {tenantActivity.length === 0 ? (
            <p className="text-center py-6 text-gray-500">No tenant activity yet</p>
          ) : (
            <div className="space-y-4">
              {tenantActivity.map((tenant) => (
                <div
                  key={tenant.tenant_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        {tenant.company_name}
                      </h4>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tenant.subscription_status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {tenant.subscription_status === 'active' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {tenant.subscription_status}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tenant.subscription_tier}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                      <span>{tenant.total_projects} projects</span>
                      <span>{tenant.total_members} members</span>
                      <span>{(tenant.total_revenue / 1000).toFixed(0)}K MNT</span>
                    </div>
                  </div>
                  <a
                    href={`/admin/tenants/${tenant.tenant_id}`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View →
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
