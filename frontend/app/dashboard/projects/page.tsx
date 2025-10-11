'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Project, projectApi } from '@/lib/api/projects';
import { PlusIcon, SettingsIcon, RefreshCwIcon, TrashIcon, BotIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ProjectsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getAll();
      setProjects(response.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (id: string) => {
    try {
      setSyncing(id);
      await projectApi.sync(id);
      toast({
        title: 'Success',
        description: 'Project synced successfully',
      });
      await loadProjects();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sync project',
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? This will also delete all associated telegram groups and membership plans.')) {
      return;
    }

    try {
      await projectApi.delete(id);
      toast({
        title: 'Success',
        description: 'Project deleted',
      });
      await loadProjects();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage your Telegram bot projects and their associated groups
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/projects/create')}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BotIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              Get started by creating your first project. Each project can have multiple Telegram groups with paid memberships.
            </p>
            <Button onClick={() => router.push('/dashboard/projects/create')}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{project.display_name}</CardTitle>
                    <CardDescription className="mt-1">
                      @{project.bot_username}
                    </CardDescription>
                  </div>
                  <Badge variant={project.is_active ? 'default' : 'secondary'}>
                    {project.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {project.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  >
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Manage
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(project.id)}
                    disabled={syncing === project.id}
                  >
                    <RefreshCwIcon className={`h-4 w-4 ${syncing === project.id ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(project.id)}
                  >
                    <TrashIcon className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
