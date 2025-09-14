'use client';

import { useRouter } from 'next/navigation';
import { CreateUserForm } from 'components/user-management/CreateUserForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CreateUserPage() {
  const router = useRouter();

  const handleSuccess = () => {
    // Redirect back to users list after successful creation
    router.push('/dashboard/users');
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className='container mx-auto py-6 max-w-2xl'>
      <div className='mb-6'>
        <Button variant='ghost' onClick={handleCancel} className='mb-4'>
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Users
        </Button>
      </div>

      <CreateUserForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
}
