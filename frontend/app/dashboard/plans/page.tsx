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
  name: z.string().min(1, 'Багцын нэр шаардлагатай').max(100, 'Нэр хэт урт байна'),
  description: z.string().optional(),
  price: z.number().min(0, 'Үнэ эерэг байх ёстой'),
  duration_days: z.number().min(1, 'Хугацаа дор хаяж 1 өдөр байх ёстой'),
  project_id: z.string().min(1, 'Төсөл шаардлагатай'),
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
        setError('Багцуудыг ачаалж чадсангүй');
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
      // TODO: Add telegram group selection to this form. For now, using empty array will fail validation.
      const createData = {
        ...data,
        telegram_group_ids: [], // Backend requires at least 1 group - this will fail validation
      };
      const newPlan = await membershipPlanApi.create(createData);
      setPlans(prev => [newPlan, ...prev]);
      setIsCreateModalOpen(false);
      reset();
    } catch (err: any) {
      console.error('Failed to create plan:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Багц үүсгэж чадсангүй';
      setError(errorMessage);

      // If it's a 401, the user might need to log in again
      if (err.response?.status === 401) {
        alert('Таны нэвтрэлт дууссан байна. Дахин нэвтэрнэ үү.');
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
    if (days === 1) return '1 өдөр';
    if (days === 7) return '1 долоо хоног';
    if (days === 30) return '1 сар';
    if (days === 90) return '3 сар';
    if (days === 365) return '1 жил';
    return `${days} өдөр`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Багцууд</h1>
            <p className="text-gray-600">Гишүүнчлэлийн багцуудаа удирдах</p>
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
          Дахин оролдох
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Багцууд</h1>
          <p className="text-gray-600">
            Telegram группүүдийн гишүүнчлэлийн багцуудыг үүсгэх, удирдах
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Багц үүсгэх
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Нийт багц</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Идэвхитэй багц</CardTitle>
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
            <CardTitle className="text-sm font-medium">Дундаж үнэ</CardTitle>
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
            <CardTitle className="text-sm font-medium">Захиалагчид</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Идэвхитэй захиалга
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <Card className="col-span-full">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Багц байхгүй байна</h3>
            <p className="text-gray-500 text-center mb-6 max-w-md">
              Telegram группүүддээ төлбөртэй гишүүнчлэл санал болгохын тулд эхний багцаа үүсгээрэй.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Эхний багцаа үүсгэх
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
                      {plan.is_active ? 'Идэвхитэй' : 'Идэвхгүй'}
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
                        Засах
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTogglePlan(plan)}>
                        {plan.is_active ? (
                          <>
                            <EyeOff className="mr-2 h-4 w-4" />
                            Идэвхгүй болгох
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            Идэвхжүүлэх
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleteConfirmPlan(plan)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Устгах
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
                    {formatDuration(plan.duration_days)} тутамд
                  </div>
                </div>

                {/* Features */}
                {plan.features && plan.features.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Онцлог</h4>
                    <ul className="text-sm space-y-1">
                      {plan.features.map((feature: string, index: number) => (
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
                    <span className="text-gray-500">Хугацаа</span>
                    <p className="font-medium">{formatDuration(plan.duration_days)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Валют</span>
                    <p className="font-medium">MNT (₮)</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4">
                  <Button variant="outline" className="w-full">
                    Дэлгэрэнгүй
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
              Багц үүсгэх
            </DialogTitle>
            <DialogDescription>
              Telegram группүүддээ шинэ гишүүнчлэлийн багц үүсгэх.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project_id">Төсөл</Label>
              <Controller
                name="project_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={errors.project_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Төсөл сонгох" />
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
                Энэ багц хамаарах төслийг сонгох
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Багцын нэр</Label>
              <Input
                id="name"
                placeholder="Премиум гишүүнчлэл"
                {...register('name')}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-red-600 text-sm">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Тайлбар (Заавал биш)</Label>
              <Input
                id="description"
                placeholder="Премиум контент болон онцлогууд"
                {...register('description')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Үнэ (₮)</Label>
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
                Монгол төгрөгөөр дүн оруулна уу
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_days">Хугацаа (Өдөр)</Label>
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
                Түгээмэл утгууд: 7 (долоо хоног), 30 (сар), 365 (жил)
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isCreating}
              >
                Цуцлах
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Үүсгэж байна...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Багц үүсгэх
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
              Багц засах
            </DialogTitle>
            <DialogDescription>
              Гишүүнчлэлийн багцын дэлгэрэнгүйг засах.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleUpdatePlan)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project_id">Төсөл</Label>
              <Controller
                name="project_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={errors.project_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Төсөл сонгох" />
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
                Энэ багц хамаарах төслийг сонгох
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name">Багцын нэр</Label>
              <Input
                id="edit-name"
                placeholder="Премиум гишүүнчлэл"
                {...register('name')}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-red-600 text-sm">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Тайлбар (Заавал биш)</Label>
              <Input
                id="edit-description"
                placeholder="Премиум контент болон онцлогууд"
                {...register('description')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-price">Үнэ (₮)</Label>
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
                Монгол төгрөгөөр дүн оруулна уу
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-duration_days">Хугацаа (Өдөр)</Label>
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
                Түгээмэл утгууд: 7 (долоо хоног), 30 (сар), 365 (жил)
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
                Цуцлах
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Шинэчилж байна...
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Багц шинэчлэх
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
              Багц устгах
            </DialogTitle>
            <DialogDescription>
              &quot;{deleteConfirmPlan?.name}&quot; багцыг устгахдаа итгэлтэй байна уу?
              Энэ үйлдлийг буцаах боломжгүй.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
            <p className="text-sm text-yellow-800">
              <strong>Анхааруулга:</strong> Энэ багцыг устгах нь одоогийн гишүүдэд нөлөөлөхгүй боловч шинэ хэрэглэгчид энэ багцаар бүртгүүлэх боломжгүй болно.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmPlan(null)}
              disabled={isDeleting}
            >
              Цуцлах
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
                  Устгаж байна...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Багц устгах
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}