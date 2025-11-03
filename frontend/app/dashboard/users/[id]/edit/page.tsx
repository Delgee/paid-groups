'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { EditUserForm } from 'components/user-management/EditUserForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { apiClient, userQueryKeys } from '@/lib/api/client';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;

  // Fetch all users and find the specific user
  const { data, isLoading, error } = useQuery({
    queryKey: userQueryKeys.list({ page: 1, limit: 1000 }),
    queryFn: () => apiClient.getUsers({ page: 1, limit: 1000 }),
    staleTime: 30 * 1000,
  });

  const user = data?.users.find((u) => u.id === userId);

  const handleSuccess = () => {
    // Redirect back to users list after successful update
    router.push('/dashboard/users');
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading user...</span>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">
                {error ? 'Failed to load user' : 'User not found'}
              </p>
              <Button onClick={() => router.push('/dashboard/users')}>
                Back to Users
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role === 'owner') {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">
                Owner users cannot be edited through this interface
              </p>
              <Button onClick={() => router.push('/dashboard/users')}>
                Back to Users
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={handleCancel} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </div>

      <EditUserForm user={user} onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
}
