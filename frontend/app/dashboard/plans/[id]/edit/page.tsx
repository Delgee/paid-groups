'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, CreditCard, Users, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { telegramGroupsApi, TelegramGroup } from '@/lib/api/telegram-groups';
import { membershipPlanApi, MembershipPlan } from '@/lib/api/membership-plans';
import { toast } from 'sonner';

const editPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  price: z.number().min(1000, 'Price must be at least 1,000 MNT'),
  duration_days: z.number().min(1, 'Duration must be at least 1 day'),
});

type EditPlanFormData = z.infer<typeof editPlanSchema>;

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;

  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [plan, setPlan] = useState<MembershipPlan | null>(null);
  const [telegramGroups, setTelegramGroups] = useState<TelegramGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditPlanFormData>({
    resolver: zodResolver(editPlanSchema),
  });

  // Fetch membership plan details
  useEffect(() => {
    const fetchPlan = async () => {
      if (!planId) return;

      setIsLoading(true);
      try {
        const fetchedPlan = await membershipPlanApi.getById(planId);
        setPlan(fetchedPlan);

        // Set form default values
        reset({
          name: fetchedPlan.name,
          description: fetchedPlan.description || '',
          price: fetchedPlan.price,
          duration_days: fetchedPlan.duration_days,
        });

        // Set selected telegram groups if available
        if (fetchedPlan.telegram_groups) {
          setSelectedGroupIds(fetchedPlan.telegram_groups.map(g => g.id));
        }
      } catch (error) {
        console.error('Failed to fetch plan:', error);
        toast.error('Failed to load membership plan');
        router.push('/dashboard/plans');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlan();
  }, [planId, reset, router]);

  // Fetch telegram groups for this plan's project
  useEffect(() => {
    const fetchTelegramGroups = async () => {
      if (!plan?.project_id) return;

      setIsLoadingGroups(true);
      try {
        const response = await telegramGroupsApi.listTelegramGroups({
          project_id: plan.project_id,
          limit: 100,
        });
        setTelegramGroups(response.data);
      } catch (error) {
        console.error('Failed to fetch telegram groups:', error);
        toast.error('Failed to load telegram groups');
      } finally {
        setIsLoadingGroups(false);
      }
    };

    fetchTelegramGroups();
  }, [plan?.project_id]);

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const onSubmit = async (data: EditPlanFormData) => {
    try {
      setIsUpdating(true);

      // Validate that at least one telegram group is selected
      if (selectedGroupIds.length === 0) {
        toast.error('Please select at least one Telegram group for this membership plan');
        setIsUpdating(false);
        return;
      }

      // Include telegram_group_ids in the update request
      const requestData = {
        name: data.name,
        description: data.description,
        price: data.price,
        duration_days: data.duration_days,
        telegram_group_ids: selectedGroupIds,
      };

      const updatedPlan = await membershipPlanApi.update(planId, requestData);

      toast.success(`Membership plan "${updatedPlan.name}" updated successfully!`);

      // Redirect back to project details or plans list
      if (plan?.project_id) {
        router.push(`/dashboard/projects/${plan.project_id}`);
      } else {
        router.push('/dashboard/plans');
      }
    } catch (err: any) {
      console.error('Failed to update plan:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update plan';
      toast.error(errorMessage);

      // If it's a 401, the user might need to log in again
      if (err.response?.status === 401) {
        toast.error('Your session has expired. Please log in again.');
        router.push('/login');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <span className="ml-3 text-lg text-gray-600">Loading plan details...</span>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <div className="text-center py-12">
          <p className="text-red-600 text-lg">Membership plan not found</p>
          <Button onClick={() => router.push('/dashboard/plans')} className="mt-4">
            Back to Plans
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Edit Membership Plan</h1>
          <p className="text-muted-foreground">
            Update the details for &quot;{plan.name}&quot;
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Plan Details
          </CardTitle>
          <CardDescription>
            Update your membership plan pricing and duration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name *</Label>
              <Input
                id="name"
                placeholder="Premium Membership"
                {...register('name')}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-red-600 text-sm">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Access to premium content and features"
                rows={3}
                {...register('description')}
              />
              <p className="text-xs text-muted-foreground">
                Describe what members get with this plan
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Price (MNT) *</Label>
                <div className="relative">
                  <Input
                    id="price"
                    type="number"
                    step="1"
                    placeholder="50000"
                    {...register('price', { valueAsNumber: true })}
                    className={errors.price ? 'border-red-500' : ''}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-muted-foreground">₮</span>
                  </div>
                </div>
                {errors.price && (
                  <p className="text-red-600 text-sm">{errors.price.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Amount in Mongolian Tugrik (minimum 1,000)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration_days">Duration (Days) *</Label>
                <Input
                  id="duration_days"
                  type="number"
                  placeholder="30"
                  {...register('duration_days', { valueAsNumber: true })}
                  className={errors.duration_days ? 'border-red-500' : ''}
                />
                {errors.duration_days && (
                  <p className="text-red-600 text-sm">{errors.duration_days.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  7 (week), 30 (month), 365 (year)
                </p>
              </div>
            </div>

            {/* Telegram Groups Selector */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base">Telegram Groups Access</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Select which Telegram groups members can access with this plan
              </p>

              {isLoadingGroups ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading groups...</span>
                </div>
              ) : telegramGroups.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    No Telegram groups found for this project. Create groups first before editing plans.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                  {telegramGroups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center space-x-3 p-3 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={selectedGroupIds.includes(group.id)}
                        onCheckedChange={() => handleGroupToggle(group.id)}
                      />
                      <label
                        htmlFor={`group-${group.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{group.group_name}</p>
                            {group.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {group.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {group.member_count} members
                            </span>
                            {group.is_active && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {selectedGroupIds.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    {selectedGroupIds.length} group{selectedGroupIds.length > 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isUpdating}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating} className="flex-1">
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Update Plan
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}