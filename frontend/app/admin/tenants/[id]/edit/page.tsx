'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi } from '@/lib/api/admin';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const updateTenantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  subscription_tier: z.enum(['free', 'starter', 'pro', 'enterprise']),
  subscription_status: z.enum(['active', 'suspended', 'cancelled']),
  max_bots: z.number().int().min(-1),
  max_groups_per_bot: z.number().int().min(-1),
  max_members: z.number().int().min(-1),
});

type UpdateTenantData = z.infer<typeof updateTenantSchema>;

export default function EditTenantPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateTenantData>({
    resolver: zodResolver(updateTenantSchema),
  });

  const subscriptionTier = watch('subscription_tier');
  const subscriptionStatus = watch('subscription_status');

  useEffect(() => {
    if (tenantId) {
      fetchTenant();
    }
  }, [tenantId]);

  async function fetchTenant() {
    try {
      setIsFetching(true);
      const tenant = await adminApi.getTenant(tenantId);

      // Populate form with existing data
      reset({
        name: tenant.name,
        company_name: tenant.company_name,
        subscription_tier: tenant.subscription_tier as any,
        subscription_status: tenant.subscription_status as any,
        max_bots: tenant.max_bots,
        max_groups_per_bot: tenant.max_groups_per_bot,
        max_members: tenant.max_members,
      });
    } catch (err) {
      console.error('Failed to fetch tenant:', err);
      setError('Failed to load tenant data');
    } finally {
      setIsFetching(false);
    }
  }

  const onSubmit = async (data: UpdateTenantData) => {
    setError(null);
    setIsLoading(true);

    try {
      await adminApi.updateTenant(tenantId, data);
      router.push(`/admin/tenants/${tenantId}`);
    } catch (err) {
      console.error('Failed to update tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to update tenant');
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error && isFetching) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg font-medium mb-4">{error}</div>
        <Link href="/admin/tenants">
          <Button>Back to Tenants</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href={`/admin/tenants/${tenantId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Tenant</h1>
          <p className="mt-1 text-lg text-gray-600">Update tenant details</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && !isFetching && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update the tenant&apos;s basic details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                {...register('company_name')}
                placeholder="Acme Corporation"
              />
              {errors.company_name && (
                <p className="text-red-600 text-sm">{errors.company_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Acme Corp"
              />
              {errors.name && (
                <p className="text-red-600 text-sm">{errors.name.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Configure subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subscription_tier">Tier *</Label>
              <Select
                value={subscriptionTier}
                onValueChange={(value) => setValue('subscription_tier', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscription_status">Status *</Label>
              <Select
                value={subscriptionStatus}
                onValueChange={(value) => setValue('subscription_status', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limits</CardTitle>
            <CardDescription>Set resource limits (-1 for unlimited)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max_bots">Max Bots</Label>
              <Input
                id="max_bots"
                type="number"
                {...register('max_bots', { valueAsNumber: true })}
              />
              {errors.max_bots && (
                <p className="text-red-600 text-sm">{errors.max_bots.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_groups_per_bot">Max Groups per Bot</Label>
              <Input
                id="max_groups_per_bot"
                type="number"
                {...register('max_groups_per_bot', { valueAsNumber: true })}
              />
              {errors.max_groups_per_bot && (
                <p className="text-red-600 text-sm">{errors.max_groups_per_bot.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_members">Max Members</Label>
              <Input
                id="max_members"
                type="number"
                {...register('max_members', { valueAsNumber: true })}
              />
              {errors.max_members && (
                <p className="text-red-600 text-sm">{errors.max_members.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Link href={`/admin/tenants/${tenantId}`}>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Tenant'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
