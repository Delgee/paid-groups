'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminApi, type Tenant, type TenantStats } from '@/lib/api/admin';
import { ArrowLeft, Edit, Trash2, Building2, TrendingUp, Users, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchTenantData();
    }
  }, [tenantId]);

  async function fetchTenantData() {
    try {
      setIsLoading(true);
      const [tenantData, statsData] = await Promise.all([
        adminApi.getTenant(tenantId),
        adminApi.getTenantStats(tenantId),
      ]);
      setTenant(tenantData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch tenant data:', err);
      setError('Failed to load tenant data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!tenant) return;

    if (!confirm(`Are you sure you want to delete tenant "${tenant.company_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await adminApi.deleteTenant(tenantId);
      router.push('/admin/tenants');
    } catch (err) {
      console.error('Failed to delete tenant:', err);
      alert('Failed to delete tenant');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !tenant || !stats) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg font-medium mb-4">
          {error || 'Tenant not found'}
        </div>
        <Link href="/admin/tenants">
          <Button>Back to Tenants</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/tenants">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{tenant.company_name}</h1>
            <p className="mt-1 text-lg text-gray-600">{tenant.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link href={`/admin/tenants/${tenantId}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_projects}</div>
            <p className="text-xs text-muted-foreground">Total projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Groups</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_groups}</div>
            <p className="text-xs text-muted-foreground">Telegram groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_members}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active_memberships} active memberships
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.total_revenue / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-muted-foreground">MNT total</p>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  tenant.subscription_status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : tenant.subscription_status === 'suspended'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {tenant.subscription_status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Tier</span>
              <span className="text-sm font-medium">{tenant.subscription_tier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Max Bots</span>
              <span className="text-sm font-medium">
                {tenant.max_bots === -1 ? 'Unlimited' : tenant.max_bots}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Max Groups per Bot</span>
              <span className="text-sm font-medium">
                {tenant.max_groups_per_bot === -1 ? 'Unlimited' : tenant.max_groups_per_bot}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Max Members</span>
              <span className="text-sm font-medium">
                {tenant.max_members === -1 ? 'Unlimited' : tenant.max_members}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Tenant ID</span>
              <span className="text-sm font-mono">{tenant.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">QPay Merchant ID</span>
              <span className="text-sm font-mono">
                {tenant.qpay_merchant_id || 'Not configured'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Created At</span>
              <span className="text-sm">
                {new Date(tenant.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Last Updated</span>
              <span className="text-sm">
                {new Date(tenant.updated_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      {Object.keys(tenant.settings || {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Custom tenant settings</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(tenant.settings, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
