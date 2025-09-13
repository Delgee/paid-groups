'use client';

import { useRouter } from 'next/navigation';
import { UserList } from '@/components/user-management/UserList';

export default function UsersPage() {
  const router = useRouter();

  const handleCreateUser = () => {
    router.push('/users/create');
  };

  return (
    <div className="container mx-auto py-6">
      <UserList onCreateUser={handleCreateUser} />
    </div>
  );
}