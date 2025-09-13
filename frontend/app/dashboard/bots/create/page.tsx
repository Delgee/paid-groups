'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import CreateBotForm from '@/components/features/bots/create-bot-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CreateBotPage() {
  const router = useRouter();

  const handleSuccess = (botId: string) => {
    router.push(`/dashboard/bots/${botId}`);
  };

  const handleCancel = () => {
    router.push('/dashboard/bots');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/bots">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bots
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Bot</h1>
          <p className="text-gray-600">Add a Telegram bot to manage your paid groups</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <CreateBotForm 
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}