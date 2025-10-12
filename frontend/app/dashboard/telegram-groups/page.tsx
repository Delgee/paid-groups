'use client';

import { useRouter } from 'next/navigation';
import { TelegramGroupList } from 'components/telegram-groups/TelegramGroupList';
import { TelegramGroup } from '@/lib/api/telegram-groups';
import { toast } from 'sonner';

export default function TelegramGroupsPage() {
  const router = useRouter();

  const handleEditGroup = (group: TelegramGroup) => {
    router.push(`/dashboard/telegram-groups/${group.id}/edit`);
  };

  const handleDeleteGroup = (group: TelegramGroup) => {
    // TODO: Implement delete functionality
    toast.info(`Delete functionality for "${group.group_name}" will be implemented soon`);
  };

  return (
    <div className="container mx-auto py-6">
      <TelegramGroupList
        onEditGroup={handleEditGroup}
        onDeleteGroup={handleDeleteGroup}
      />
    </div>
  );
}