'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Project, projectApi } from '@/lib/api/projects';
import { TelegramGroup, telegramGroupsApi } from '@/lib/api/telegram-groups';
import { ArrowLeftIcon, SettingsIcon, RefreshCwIcon, PlusIcon, UsersIcon, LayersIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [telegramGroups, setTelegramGroups] = useState<TelegramGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadProject();
    loadTelegramGroups();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await projectApi.getById(projectId);
      setProject(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load project',
        variant: 'destructive',
      });
      router.push('/dashboard/projects');
    } finally {
      setLoading(false);
    }
  };

  const loadTelegramGroups = async () => {
    try {
      setLoadingGroups(true);
      const response = await telegramGroupsApi.listTelegramGroups({
        project_id: projectId,
        limit: 50,
      });
      setTelegramGroups(response.data);
    } catch (error) {
      console.error('Failed to load telegram groups:', error);
      // Don't show error toast, just log it
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await projectApi.sync(projectId);
      toast({
        title: 'Success',
        description: 'Project synced successfully',
      });
      await loadProject();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sync project',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <Button
        variant="ghost"
        onClick={() => router.push('/dashboard/projects')}
        className="mb-4"
      >
        <ArrowLeftIcon className="mr-2 h-4 w-4" />
        Back to Projects
      </Button>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.display_name}</h1>
          <p className="text-muted-foreground mt-1">@{project.bot_username}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={project.is_active ? 'default' : 'secondary'}>
            {project.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCwIcon className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/projects/${projectId}/edit`)}
          >
            <SettingsIcon className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-sm mt-1">{project.description}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-muted-foreground">Welcome Message</p>
            <p className="text-sm mt-1 whitespace-pre-wrap">{project.welcome_message}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="text-sm mt-1">{new Date(project.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="text-sm mt-1">{new Date(project.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="groups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="groups">
            <UsersIcon className="mr-2 h-4 w-4" />
            Telegram Groups
          </TabsTrigger>
          <TabsTrigger value="plans">
            <LayersIcon className="mr-2 h-4 w-4" />
            Membership Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Telegram Groups</CardTitle>
                  <CardDescription>
                    Manage groups associated with this project
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push(`/dashboard/telegram-groups/create?project_id=${projectId}`)}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Group
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingGroups ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCwIcon className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : telegramGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No groups yet. Create a telegram group to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {telegramGroups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{group.group_name}</h4>
                          <Badge variant={group.telegram_chat_id ? 'default' : 'secondary'}>
                            {group.telegram_chat_id ? 'Connected' : 'Not Connected'}
                          </Badge>
                          <Badge variant="outline">{group.group_type}</Badge>
                        </div>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                        )}
                        {group.username && (
                          <p className="text-xs text-muted-foreground mt-1">@{group.username}</p>
                        )}
                        {group.telegram_chat_id && (
                          <p className="text-xs text-muted-foreground">
                            Members: {group.member_count || 0}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/telegram-groups/${group.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Membership Plans</CardTitle>
                  <CardDescription>
                    Manage pricing plans for this project
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push(`/dashboard/plans/create?project_id=${projectId}`)}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Plan
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                No membership plans yet. Create a plan to start accepting payments.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
