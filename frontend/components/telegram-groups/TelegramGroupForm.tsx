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
    .min(1, 'Group name is required')
    .max(255, 'Group name must not exceed 255 characters')
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional()
    .transform((val) => (val?.trim() === '' ? undefined : val?.trim())),
  project_id: z.string().uuid('Please select a valid project'),
  settings: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return undefined;
      try {
        return JSON.parse(val.trim());
      } catch {
        throw new Error('Settings must be valid JSON');
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

      // Add project_id only for create mode (required for creation)
      if (mode === 'create') {
        (submitData as CreateTelegramGroupData).project_id = data.project_id;
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
            message: 'Group name is invalid or already exists'
          });
        } else if (error.message.includes('project_id')) {
          form.setError('project_id', {
            type: 'server',
            message: 'Selected project is invalid or unavailable'
          });
        } else if (error.message.includes('settings')) {
          form.setError('settings', {
            type: 'server',
            message: 'Settings format is invalid'
          });
        } else {
          toast.error(error.message || 'An unexpected error occurred.');
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
            {mode === 'create' ? 'Create New Telegram Group' : 'Edit Telegram Group'}
          </h2>
          <p className="text-muted-foreground">
            {mode === 'create'
              ? 'Set up a new telegram group for member management.'
              : 'Update the telegram group details and settings.'
            }
          </p>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading projects...</span>
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
            {mode === 'create' ? 'Create New Telegram Group' : 'Edit Telegram Group'}
          </h2>
          <p className="text-muted-foreground">
            {mode === 'create'
              ? 'Set up a new telegram group for member management.'
              : 'Update the telegram group details and settings.'
            }
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          Failed to load projects. Please refresh the page and try again.
        </div>
      </div>
    );
  }

  const availableProjects = projectsResponse?.data?.filter(project => project.is_active) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {mode === 'create' ? 'Create New Telegram Group' : 'Edit Telegram Group'}
        </h2>
        <p className="text-muted-foreground">
          {mode === 'create'
            ? 'Set up a new telegram group for member management.'
            : 'Update the telegram group details and settings.'
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
                <FormLabel>Group Name *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter group name (e.g., VIP Premium Group)"
                    data-testid="group-name-input"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage data-testid="group-name-error" />
                <p className="text-sm text-muted-foreground">
                  A descriptive name for your telegram group
                </p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Enter a description for this group (optional)"
                    data-testid="group-description-input"
                    disabled={isLoading}
                    rows={3}
                  />
                </FormControl>
                <FormMessage data-testid="description-error" />
                <p className="text-sm text-muted-foreground">
                  Optional description to help identify the purpose of this group
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
                  <FormLabel>Project *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    data-testid="project-select"
                    disabled={isLoading || availableProjects.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="project-select-trigger">
                        <SelectValue placeholder="Select a project for this group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableProjects.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No active projects available
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
                    Choose which project/bot will manage this telegram group
                  </p>
                </FormItem>
              )}
            />
          )}

          {mode === 'create' && preselectedProjectId && projectDetails && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
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
                  Pre-selected
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                This telegram group will be created for the selected project
              </p>
            </div>
          )}

          {mode === 'edit' && projectDetails && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
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
                  Read-only
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Project cannot be changed after group creation
              </p>
            </div>
          )}

          <FormField
            control={form.control}
            name="settings"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Advanced Settings</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder='{"welcome_message": "Welcome to our group!", "auto_approve": true}'
                    data-testid="group-settings-input"
                    disabled={isLoading}
                    rows={4}
                  />
                </FormControl>
                <FormMessage data-testid="settings-error" />
                <p className="text-sm text-muted-foreground">
                  Optional JSON configuration for group settings (leave empty for defaults)
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
                ? `${mode === 'create' ? 'Creating' : 'Updating'} Group...`
                : `${mode === 'create' ? 'Create' : 'Update'} Group`
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
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Form>

      {availableProjects.length === 0 && mode === 'create' && !preselectedProjectId && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm">
          <p className="font-medium">No Active Projects Available</p>
          <p>You need to create and activate at least one project before creating a telegram group.</p>
        </div>
      )}
    </div>
  );
}