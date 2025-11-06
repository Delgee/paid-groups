'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import {
  TelegramGroup,
  CreateTelegramGroupData,
  UpdateTelegramGroupData,
} from '@/lib/api/telegram-groups';
import { projectApi } from '@/lib/api/projects';

/**
 * Validation schema for telegram group form
 */
const telegramGroupFormSchema = z.object({
  group_name: z
    .string()
    .min(1, 'Группын нэр шаардлагатай')
    .max(255, 'Группын нэр 255 тэмдэгтээс хэтрэхгүй байх ёстой')
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(1000, 'Тайлбар 1000 тэмдэгтээс хэтрэхгүй байх ёстой')
    .optional()
    .transform((val) => (val?.trim() === '' ? undefined : val?.trim())),
  project_id: z.string().uuid('Зөв төсөл сонгоно уу'),
  telegram_chat_id: z
    .string()
    .regex(/^-?\d+$/, 'Chat ID нь тоон утга байх ёстой (жишээ нь: -1001234567890)')
    .refine((val) => val.startsWith('-'), {
      message: 'Групп/сувгийн Chat ID сөрөг тоо байх ёстой (- тэмдэгтээр эхэлнэ)',
    }),
  settings: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return undefined;
      try {
        return JSON.parse(val.trim());
      } catch {
        throw new Error('Тохиргоо зөв JSON форматтай байх ёстой');
      }
    }),
});

type TelegramGroupFormData = z.infer<typeof telegramGroupFormSchema>;

/**
 * Props interface for TelegramGroupForm component
 */
interface TelegramGroupFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<TelegramGroup>;
  onSubmit: (data: CreateTelegramGroupData | UpdateTelegramGroupData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  preselectedProjectId?: string;
}

/**
 * Reusable form component for creating and editing telegram groups
 *
 * Features:
 * - Support for both create and edit modes
 * - Form validation with Zod schema
 * - Project selection dropdown
 * - JSON settings validation
 * - Proper error handling and loading states
 * - Accessible with proper test IDs
 */
export function TelegramGroupForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  preselectedProjectId,
}: TelegramGroupFormProps) {
  const { toast } = useToast();

  // Fetch available projects for the dropdown
  const {
    data: projectsResponse,
    isLoading: isLoadingProjects,
    error: projectsError,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch specific project details if preselected (create mode) or from initialData (edit mode)
  const projectIdToFetch = mode === 'create' ? preselectedProjectId : initialData?.project_id;
  const {
    data: projectDetails,
    isLoading: isLoadingProjectDetails,
  } = useQuery({
    queryKey: ['project', projectIdToFetch],
    queryFn: () => projectApi.getById(projectIdToFetch!),
    enabled: !!projectIdToFetch,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const form = useForm<TelegramGroupFormData>({
    resolver: zodResolver(telegramGroupFormSchema),
    defaultValues: {
      group_name: initialData?.group_name || '',
      description: initialData?.description || '',
      project_id: preselectedProjectId || initialData?.project_id || '',
      telegram_chat_id: initialData?.telegram_chat_id?.toString() || '',
      settings: initialData?.settings ? JSON.stringify(initialData.settings, null, 2) : '',
    },
  });

  const handleSubmit = async (data: TelegramGroupFormData) => {
    try {
      const submitData: CreateTelegramGroupData | UpdateTelegramGroupData = {
        group_name: data.group_name,
        description: data.description,
        settings: data.settings,
      };

      // Add create-only fields
      if (mode === 'create') {
        (submitData as CreateTelegramGroupData).project_id = data.project_id;
        (submitData as CreateTelegramGroupData).telegram_chat_id = data.telegram_chat_id;
      }

      await onSubmit(submitData);

      // Reset form only on successful create
      if (mode === 'create') {
        form.reset();
      }
    } catch (error) {
      // Error handling is done by the parent component
      // Show a fallback toast if the parent doesn't handle it
      console.error('Form submission error:', error);

      if (error instanceof Error) {
        // Try to parse validation errors from the error message
        if (error.message.includes('group_name')) {
          form.setError('group_name', {
            type: 'server',
            message: 'Группын нэр буруу эсвэл аль хэдийн байна'
          });
        } else if (error.message.includes('project_id')) {
          form.setError('project_id', {
            type: 'server',
            message: 'Сонгосон төсөл буруу эсвэл идэвхгүй байна'
          });
        } else if (error.message.includes('settings')) {
          form.setError('settings', {
            type: 'server',
            message: 'Тохиргооны формат буруу байна'
          });
        } else {
          toast.error(error.message || 'Санамсаргүй алдаа гарлаа');
        }
      }
    }
  };

  // Show loading state while fetching projects or project details
  if (isLoadingProjects || (projectIdToFetch && isLoadingProjectDetails)) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {mode === 'create' ? 'Шинэ Telegram групп үүсгэх' : 'Telegram групп засах'}
          </h2>
          <p className="text-muted-foreground">
            {mode === 'create'
              ? 'Гишүүдийн удирдлагын шинэ telegram групп тохируулах.'
              : 'Telegram группын дэлгэрэнгүй болон тохиргоог шинэчлэх.'
            }
          </p>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-muted-foreground">Төслүүдийг ачааллаж байна...</span>
        </div>
      </div>
    );
  }

  // Show error state if projects failed to load
  if (projectsError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {mode === 'create' ? 'Шинэ Telegram групп үүсгэх' : 'Telegram групп засах'}
          </h2>
          <p className="text-muted-foreground">
            {mode === 'create'
              ? 'Гишүүдийн удирдлагын шинэ telegram групп тохируулах.'
              : 'Telegram группын дэлгэрэнгүй болон тохиргоог шинэчлэх.'
            }
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          Төслүүдийг ачааллахад алдаа гарлаа. Хуудсыг сэргээж дахин оролдоно уу.
        </div>
      </div>
    );
  }

  const availableProjects = projectsResponse?.data?.filter(project => project.is_active) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {mode === 'create' ? 'Шинэ Telegram групп үүсгэх' : 'Telegram групп засах'}
        </h2>
        <p className="text-muted-foreground">
          {mode === 'create'
            ? 'Telegram сувгаа холбож, гишүүдийн удирдлагыг тохируулах. Бот нь суваг дээр админ эрхтэй эсэхийг шалгана уу.'
            : 'Telegram группын дэлгэрэнгүй болон тохиргоог шинэчлэх.'
          }
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="group_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Группын нэр *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Группын нэр оруулна уу (жишээ нь: VIP Төлбөртэй Групп)"
                    data-testid="group-name-input"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage data-testid="group-name-error" />
                <p className="text-sm text-muted-foreground">
                  Telegram группын тодорхойлох нэр
                </p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Тайлбар</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Энэ группын тайлбар оруулна уу (заавал биш)"
                    data-testid="group-description-input"
                    disabled={isLoading}
                    rows={3}
                  />
                </FormControl>
                <FormMessage data-testid="description-error" />
                <p className="text-sm text-muted-foreground">
                  Энэ группын зориулалтыг тодорхойлоход туслах тайлбар (заавал биш)
                </p>
              </FormItem>
            )}
          />

          {mode === 'create' && !preselectedProjectId && (
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Төсөл *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    data-testid="project-select"
                    disabled={isLoading || availableProjects.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="project-select-trigger">
                        <SelectValue placeholder="Энэ группд зориулж төсөл сонгох" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableProjects.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Идэвхтэй төсөл байхгүй байна
                        </div>
                      ) : (
                        availableProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{project.display_name}</span>
                              {project.bot_username && (
                                <span className="text-xs text-muted-foreground">
                                  @{project.bot_username}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage data-testid="project-error" />
                  <p className="text-sm text-muted-foreground">
                    Энэ telegram группыг удирдах төсөл/ботыг сонгоно уу
                  </p>
                </FormItem>
              )}
            />
          )}

          {mode === 'create' && preselectedProjectId && projectDetails && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Төсөл</label>
              <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/50">
                <div className="flex-1">
                  <p className="font-medium">{projectDetails.display_name}</p>
                  {projectDetails.bot_username && (
                    <p className="text-sm text-muted-foreground">
                      @{projectDetails.bot_username}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                  Урьдчилан сонгосон
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Энэ telegram групп сонгосон төсөлд зориулж үүсгэгдэх болно
              </p>
            </div>
          )}

          {mode === 'edit' && projectDetails && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Төсөл</label>
              <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/50">
                <div className="flex-1">
                  <p className="font-medium">{projectDetails.display_name}</p>
                  {projectDetails.bot_username && (
                    <p className="text-sm text-muted-foreground">
                      @{projectDetails.bot_username}
                    </p>
                  )}
                  {projectDetails.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {projectDetails.description}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                  Зөвхөн унших
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Групп үүсгэсний дараа төслийг өөрчлөх боломжгүй
              </p>
            </div>
          )}

          {mode === 'create' && (
            <>
              <FormField
                control={form.control}
                name="telegram_chat_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telegram Chat ID *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="-1001234567890"
                        data-testid="telegram-chat-id-input"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage data-testid="telegram-chat-id-error" />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Таны Telegram групп/сувгийн тоон ID (- тэмдэгтээр эхлэх ёстой)
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-900">
                        <p className="font-medium mb-1">Сувгийн Chat ID-г хэрхэн авах вэ:</p>
                        <ol className="list-decimal ml-4 space-y-1">
                          <li>Өөрийн сувгаас аливаа мессежийг ботруугаа дамжуулна</li>
                          <li>Бот тухайн сувгийн Chat ID-г хариу өгнө</li>
                          <li>Chat ID-г хуулаад (жишээ нь: -1001234567890) энд байрлуулна</li>
                        </ol>
                        <p className="mt-2 text-xs text-blue-700">
                          Анхааруулга: Ботыг эхлээд сувагт админаар нэмсэн эсэхээ шалгаарай
                        </p>
                      </div>
                    </div>
                  </FormItem>
                )}
              />
            </>
          )}

          {mode === 'edit' && initialData?.telegram_chat_id && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Telegram суваг</label>
              <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/50">
                <div className="flex-1">
                  <p className="font-medium">Chat ID: {initialData.telegram_chat_id}</p>
                  {initialData.username && (
                    <p className="text-sm text-muted-foreground">
                      @{initialData.username}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                  Холбогдсон
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Групп үүсгэсний дараа сувгийн холболтыг өөрчлөх боломжгүй
              </p>
            </div>
          )}

          <FormField
            control={form.control}
            name="settings"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Нарийвчилсан тохиргоо</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder='{"welcome_message": "Манай группд тавтай морилно уу!", "auto_approve": true}'
                    data-testid="group-settings-input"
                    disabled={isLoading}
                    rows={4}
                  />
                </FormControl>
                <FormMessage data-testid="settings-error" />
                <p className="text-sm text-muted-foreground">
                  Группын тохиргооны JSON формат (анхдагч утгад үлдээх бол хоосон үлдээх)
                </p>
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading || (mode === 'create' && !preselectedProjectId && availableProjects.length === 0)}
              data-testid="submit-button"
              className="flex-1"
            >
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" data-testid="loading-spinner" />
              )}
              {isLoading
                ? `${mode === 'create' ? 'Групп үүсгэж байна' : 'Групп шинэчилж байна'}...`
                : `${mode === 'create' ? 'Групп үүсгэх' : 'Групп шинэчлэх'}`
              }
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                data-testid="cancel-button"
              >
                Болих
              </Button>
            )}
          </div>
        </form>
      </Form>

      {availableProjects.length === 0 && mode === 'create' && !preselectedProjectId && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm">
          <p className="font-medium">Идэвхтэй төсөл байхгүй байна</p>
          <p>Telegram групп үүсгэхээсээ өмнө нэг идэвхтэй төсөл үүсгэх шаардлагатай.</p>
        </div>
      )}
    </div>
  );
}