'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Project, projectApi } from '@/lib/api/projects';
import { PlusIcon, SettingsIcon, RefreshCwIcon, TrashIcon, BotIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { BotAvatar } from '@/components/projects/BotAvatar';

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
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Төслүүдийг ачаалж чадсангүй';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (id: string) => {
    try {
      setSyncing(id);
      await projectApi.sync(id);
      toast.success('Төслийг амжилттай синк хийлээ');
      await loadProjects();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Төслийг синк хийхэд алдаа гарлаа';
      toast.error(errorMessage);
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Энэ төслийг устгахдаа итгэлтэй байна уу? Холбогдох бүх Telegram групп болон багцууд устах болно.')) {
      return;
    }

    try {
      await projectApi.delete(id);
      toast.success('Төслийг амжилттай устгалаа');
      await loadProjects();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Төсөл устгахад алдаа гарлаа';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Төслүүдийг ачаалж байна...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Төслүүд</h1>
          <p className="text-muted-foreground mt-2">
            Telegram ботын төслүүд болон холбогдох группүүдийг удирдах
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/projects/create')}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Төсөл нэмэх
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BotIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Төсөл байхгүй байна</h3>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              Эхний төслөө үүсгээд эхлээрэй. Төсөл бүр олон Telegram групптэй, төлбөртэй гишүүнчлэлтэй байж болно.
            </p>
            <Button onClick={() => router.push('/dashboard/projects/create')}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Төсөл үүсгэх
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <BotAvatar
                      avatarUrl={project.bot_avatar_url}
                      displayName={project.display_name}
                      username={project.bot_username}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl truncate">{project.display_name}</CardTitle>
                      <CardDescription className="mt-1 truncate">
                        @{project.bot_username}
                      </CardDescription>
                      {project.last_sync_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Сүүлд синк хийсэн: {new Date(project.last_sync_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={project.is_active ? 'default' : 'secondary'}>
                    {project.is_active ? 'Идэвхитэй' : 'Идэвхгүй'}
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
                    Үүсгэсэн {new Date(project.created_at).toLocaleDateString()}
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
                    Удирдах
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
