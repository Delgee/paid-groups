'use client';

import { useEffect, useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  MoreHorizontal,
  DollarSign,
  Users,
  Edit,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { membershipPlanApi, type MembershipPlan } from '@/lib/api/membership-plans';
import { projectApi, type Project } from '@/lib/api/projects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Simple Badge component
function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

const createPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  duration_days: z.number().min(1, 'Duration must be at least 1 day'),
  project_id: z.string().min(1, 'Project is required'),
});

type CreatePlanFormData = z.infer<typeof createPlanSchema>;

export default function PlansPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<MembershipPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<CreatePlanFormData>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      duration_days: 30,
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [plansData, projectsData] = await Promise.all([
          membershipPlanApi.getAll(),
          projectApi.getAll(),
        ]);
        setPlans(plansData);
        setProjects(projectsData.data);
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load membership plans');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const onSubmit = async (data: CreatePlanFormData) => {
    try {
      setIsCreating(true);
      setError(null);
      const newPlan = await membershipPlanApi.create(data);
      setPlans(prev => [newPlan, ...prev]);
      setIsCreateModalOpen(false);
      reset();
    } catch (err: any) {
      console.error('Failed to create plan:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create plan';
      setError(errorMessage);

      // If it's a 401, the user might need to log in again
      if (err.response?.status === 401) {
        alert('Your session has expired. Please log in again.');
        window.location.href = '/login';
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleTogglePlan = async (plan: MembershipPlan) => {
    try {
      const updatedPlan = await membershipPlanApi.update(plan.id, {
        is_active: !plan.is_active
      });
      setPlans(prev => prev.map(p => p.id === plan.id ? updatedPlan : p));
    } catch (err) {
      console.error('Failed to toggle plan:', err);
    }
  };

  const handleEditPlan = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    reset({
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      duration_days: plan.duration_days,
      project_id: plan.project_id,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdatePlan = async (data: CreatePlanFormData) => {
    if (!editingPlan) return;

    try {
      setIsUpdating(true);
      const updatedPlan = await membershipPlanApi.update(editingPlan.id, data);
      setPlans(prev => prev.map(p => p.id === editingPlan.id ? updatedPlan : p));
      setIsEditModalOpen(false);
      setEditingPlan(null);
      reset();
    } catch (err: any) {
      console.error('Failed to update plan:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!deleteConfirmPlan) return;

    try {
      setIsDeleting(true);
      await membershipPlanApi.delete(deleteConfirmPlan.id);
      setPlans(prev => prev.filter(p => p.id !== deleteConfirmPlan.id));
      setDeleteConfirmPlan(null);
    } catch (err: any) {
      console.error('Failed to delete plan:', err);
      // Handle error - could show a toast notification
    } finally {
      setIsDeleting(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    // Format MNT currency properly
    if (currency === 'MNT') {
      return new Intl.NumberFormat('mn-MN', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price) + ' ₮';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const formatDuration = (days: number) => {
    if (days === 1) return '1 day';
    if (days === 7) return '1 week';
    if (days === 30) return '1 month';
    if (days === 90) return '3 months';
    if (days === 365) return '1 year';
    return `${days} days`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Membership Plans</h1>
            <p className="text-gray-600">Manage your subscription plans</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-64"></div>
          ))}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Membership Plans</h1>
          <p className="text-gray-600">
            Create and manage subscription plans for your Telegram groups
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.filter(p => p.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.length > 0
                ? new Intl.NumberFormat('mn-MN').format(
                    Math.round(plans.reduce((sum, p) => sum + p.price, 0) / plans.length)
                  ) + ' ₮'
                : '0 ₮'
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Active subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <Card className="col-span-full">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No membership plans yet</h3>
            <p className="text-gray-500 text-center mb-6 max-w-md">
              Create your first membership plan to start offering paid subscriptions 
              to your Telegram groups.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <Badge variant={plan.is_active ? 'success' : 'warning'}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditPlan(plan)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Plan
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTogglePlan(plan)}>
                        {plan.is_active ? (
                          <>
                            <EyeOff className="mr-2 h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleteConfirmPlan(plan)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Plan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {plan.description && (
                  <CardDescription>{plan.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price */}
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-primary">
                    {formatPrice(plan.price, plan.currency)}
                  </div>
                  <div className="text-sm text-gray-500">
                    per {formatDuration(plan.duration_days)}
                  </div>
                </div>

                {/* Features */}
                {plan.features && plan.features.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Features</h4>
                    <ul className="text-sm space-y-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <span className="w-1 h-1 bg-blue-600 rounded-full mr-2"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t">
                  <div>
                    <span className="text-gray-500">Duration</span>
                    <p className="font-medium">{formatDuration(plan.duration_days)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Currency</span>
                    <p className="font-medium">MNT (₮)</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4">
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Create Membership Plan
            </DialogTitle>
            <DialogDescription>
              Create a new subscription plan for your Telegram groups.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project_id">Project</Label>
              <Controller
                name="project_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={errors.project_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.project_id && (
                <p className="text-red-600 text-sm">{errors.project_id.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Select the project this plan belongs to
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
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
              <Input
                id="description"
                placeholder="Access to premium content and features"
                {...register('description')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (MNT)</Label>
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
                  <span className="text-gray-500">₮</span>
                </div>
              </div>
              {errors.price && (
                <p className="text-red-600 text-sm">{errors.price.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Enter amount in Mongolian Tugrik (₮)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_days">Duration (Days)</Label>
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
              <p className="text-xs text-gray-500">
                Common values: 7 (week), 30 (month), 365 (year)
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Membership Plan
            </DialogTitle>
            <DialogDescription>
              Update your subscription plan details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleUpdatePlan)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project_id">Project</Label>
              <Controller
                name="project_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={errors.project_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.project_id && (
                <p className="text-red-600 text-sm">{errors.project_id.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Select the project this plan belongs to
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name">Plan Name</Label>
              <Input
                id="edit-name"
                placeholder="Premium Membership"
                {...register('name')}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-red-600 text-sm">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Input
                id="edit-description"
                placeholder="Access to premium content and features"
                {...register('description')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-price">Price (MNT)</Label>
              <div className="relative">
                <Input
                  id="edit-price"
                  type="number"
                  step="1"
                  placeholder="50000"
                  {...register('price', { valueAsNumber: true })}
                  className={errors.price ? 'border-red-500' : ''}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500">₮</span>
                </div>
              </div>
              {errors.price && (
                <p className="text-red-600 text-sm">{errors.price.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Enter amount in Mongolian Tugrik (₮)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-duration_days">Duration (Days)</Label>
              <Input
                id="edit-duration_days"
                type="number"
                placeholder="30"
                {...register('duration_days', { valueAsNumber: true })}
                className={errors.duration_days ? 'border-red-500' : ''}
              />
              {errors.duration_days && (
                <p className="text-red-600 text-sm">{errors.duration_days.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Common values: 7 (week), 30 (month), 365 (year)
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingPlan(null);
                  reset();
                }}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Update Plan
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmPlan} onOpenChange={(open) => !open && setDeleteConfirmPlan(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Membership Plan
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirmPlan?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Deleting this plan will not affect existing members,
              but new users won&apos;t be able to subscribe to this plan.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmPlan(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeletePlan}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}