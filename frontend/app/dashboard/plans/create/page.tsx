'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, CreditCard, Users, Gift } from 'lucide-react';
import { useState, useEffect } from 'react';
import { telegramGroupsApi, TelegramGroup } from '@/lib/api/telegram-groups';
import { membershipPlanApi } from '@/lib/api/membership-plans';
import { toast } from 'sonner';

const createPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  price: z.number().min(1000, 'Price must be at least 1,000 MNT'),
  duration_days: z.number().min(1, 'Duration must be at least 1 day'),
  trial_enabled: z.boolean().optional(),
  trial_duration_seconds: z.number().min(60, 'Trial must be at least 60 seconds').max(86400, 'Trial cannot exceed 24 hours').optional(),
  project_id: z.string().uuid('Invalid project ID').optional(),
});

type CreatePlanFormData = z.infer<typeof createPlanSchema>;

export default function CreatePlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreating, setIsCreating] = useState(false);
  const [telegramGroups, setTelegramGroups] = useState<TelegramGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [trialEnabled, setTrialEnabled] = useState(false);

  // Get project_id from URL params if provided
  const projectIdFromUrl = searchParams.get('project_id');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreatePlanFormData>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      duration_days: 30,
      trial_enabled: false,
      trial_duration_seconds: 300,
      project_id: projectIdFromUrl || undefined,
    },
  });

  const trialDurationSeconds = watch('trial_duration_seconds');

  // Fetch telegram groups when project_id is available
  useEffect(() => {
    const fetchTelegramGroups = async () => {
      if (!projectIdFromUrl) return;

      setIsLoadingGroups(true);
      try {
        const response = await telegramGroupsApi.listTelegramGroups({
          project_id: projectIdFromUrl,
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
  }, [projectIdFromUrl]);

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const onSubmit = async (data: CreatePlanFormData) => {
    try {
      setIsCreating(true);

      // Validate that project_id is provided
      const projectId = projectIdFromUrl || data.project_id;
      if (!projectId) {
        toast.error('Project ID is required');
        setIsCreating(false);
        return;
      }

      // Validate that at least one telegram group is selected when project_id is provided
      if (selectedGroupIds.length === 0) {
        toast.error('Please select at least one Telegram group for this membership plan');
        setIsCreating(false);
        return;
      }

      // Include project_id, telegram_group_ids, and trial configuration in the request
      const requestData = {
        name: data.name,
        description: data.description,
        price: data.price,
        duration_days: data.duration_days,
        project_id: projectId,
        ...(selectedGroupIds.length > 0 && { telegram_group_ids: selectedGroupIds }),
        ...(trialEnabled && {
          trial_enabled: true,
          trial_duration_seconds: data.trial_duration_seconds || 300,
        }),
      };

      const newPlan = await membershipPlanApi.create(requestData);

      toast.success(`Membership plan "${newPlan.name}" created successfully!`);

      // Redirect back to plans list or project details
      if (projectIdFromUrl) {
        router.push(`/dashboard/projects/${projectIdFromUrl}`);
      } else {
        router.push('/dashboard/plans');
      }
    } catch (err: any) {
      console.error('Failed to create plan:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create plan';
      toast.error(errorMessage);

      // If it's a 401, the user might need to log in again
      if (err.response?.status === 401) {
        toast.error('Your session has expired. Please log in again.');
        router.push('/login');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Plans
        </Button>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Create Membership Plan</h1>
          <p className="text-muted-foreground">
            Set up a new subscription plan for your Telegram groups
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
            Configure your membership plan pricing and duration
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

            {/* Trial Configuration */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base">Free Trial (Optional)</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Offer a limited-time trial to let users try before they buy
              </p>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="trial-enabled" className="text-base">
                    Enable Free Trial
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Users can try this plan once before purchasing
                  </p>
                </div>
                <Switch
                  id="trial-enabled"
                  checked={trialEnabled}
                  onCheckedChange={setTrialEnabled}
                />
              </div>

              {trialEnabled && (
                <div className="space-y-2 pl-4 border-l-2 border-blue-200 ml-2">
                  <Label htmlFor="trial_duration_seconds">Trial Duration (Seconds) *</Label>
                  <Input
                    id="trial_duration_seconds"
                    type="number"
                    placeholder="300"
                    {...register('trial_duration_seconds', { valueAsNumber: true })}
                    className={errors.trial_duration_seconds ? 'border-red-500' : ''}
                  />
                  {errors.trial_duration_seconds && (
                    <p className="text-red-600 text-sm">{errors.trial_duration_seconds.message}</p>
                  )}
                  <div className="flex items-center gap-4">
                    <p className="text-xs text-muted-foreground">
                      300 (5 min) • 900 (15 min) • 3600 (1 hour) • 86400 (24 hours)
                    </p>
                    {trialDurationSeconds && trialDurationSeconds >= 60 && (
                      <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        ≈ {trialDurationSeconds < 3600
                          ? `${Math.floor(trialDurationSeconds / 60)} minutes`
                          : trialDurationSeconds < 86400
                          ? `${Math.floor(trialDurationSeconds / 3600)} hours`
                          : `${Math.floor(trialDurationSeconds / 86400)} days`
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {projectIdFromUrl && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  This plan will be created for the selected project
                </p>
              </div>
            )}

            {/* Telegram Groups Selector */}
            {projectIdFromUrl && (
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
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Loading groups...</span>
                  </div>
                ) : telegramGroups.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      No Telegram groups found for this project. Create groups first before creating plans.
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
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isCreating}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} className="flex-1">
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Create Plan
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