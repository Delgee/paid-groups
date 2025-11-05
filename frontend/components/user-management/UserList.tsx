'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { apiClient, userQueryKeys, AllUserRoles, UserSummary } from '@/lib/api/client';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface UserListProps {
  onCreateUser?: () => void;
}

export function UserList({ onCreateUser }: UserListProps) {
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<AllUserRoles | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserSummary | null>(null);
  const limit = 20;
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: userQueryKeys.list({ page, limit, role: roleFilter }),
    queryFn: () => apiClient.getUsers({ page, limit, role: roleFilter }),
    staleTime: 30 * 1000, // 30 seconds
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => apiClient.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });
      toast.success('Хэрэглэгчийг амжилттай устгалаа');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Хэрэглэгч устгахад алдаа гарлаа');
    },
  });

  const getRoleBadgeVariant = (role: AllUserRoles) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'moderator':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatLastLogin = (lastLoginAt: string | null) => {
    if (!lastLoginAt) return 'Хэзээ ч үгүй';
    return formatDistanceToNow(new Date(lastLoginAt), { addSuffix: true });
  };

  const formatCreatedAt = (createdAt: string) => {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  };

  const handleEdit = (userId: string) => {
    router.push(`/dashboard/users/${userId}/edit`);
  };

  const handleDeleteClick = (user: UserSummary) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-destructive">Хэрэглэгчдийг ачаалж чадсангүй</p>
            <Button onClick={() => refetch()}>Дахин оролдох</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Хэрэглэгч удирдлага</h1>
          <p className="text-muted-foreground">
            Байгууллагын админ болон модератор хэрэглэгчдийг удирдах
          </p>
        </div>
        {onCreateUser && (
          <Button onClick={onCreateUser} data-testid="create-user-button">
            <Users className="mr-2 h-4 w-4" />
            Шинэ хэрэглэгч нэмэх
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Хэрэглэгчид</CardTitle>
              <CardDescription>
                Нийт {data?.pagination.total ?? 0} хэрэглэгч бүртгэлтэй
              </CardDescription>
            </div>
            <Select
              value={roleFilter || 'all'}
              onValueChange={(value) => {
                setRoleFilter(value === 'all' ? undefined : value as AllUserRoles);
                setPage(1); // Reset to first page when filtering
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Эрх сонгох" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Бүх эрх</SelectItem>
                <SelectItem value="owner">Эзэмшигчид</SelectItem>
                <SelectItem value="admin">Админууд</SelectItem>
                <SelectItem value="moderator">Модераторууд</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Ачаалж байна...</span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Нэр</TableHead>
                    <TableHead>Имэйл</TableHead>
                    <TableHead>Эрх</TableHead>
                    <TableHead>Сүүлд нэвтэрсэн</TableHead>
                    <TableHead>Үүсгэсэн</TableHead>
                    <TableHead>Төлөв</TableHead>
                    <TableHead className="text-right">Үйлдэл</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.users.map((user: UserSummary) => (
                    <TableRow key={user.id} data-testid="user-list-item">
                      <TableCell>
                        <div className="font-medium" data-testid="user-name">
                          {user.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-muted-foreground">
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getRoleBadgeVariant(user.role)}
                          data-testid="user-role"
                        >
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatLastLogin(user.last_login_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatCreatedAt(user.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Идэвхитэй' : 'Идэвхгүй'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {user.role !== 'owner' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(user.id)}
                                data-testid={`edit-user-${user.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(user)}
                                data-testid={`delete-user-${user.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data?.users.length === 0 && (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">Хэрэглэгч олдсонгүй</h3>
                  <p className="text-muted-foreground">
                    {roleFilter
                      ? `${roleFilter} эрхтэй хэрэглэгч олдсонгүй. Шүүлтүүрээ тохируулна уу.`
                      : 'Эхний хэрэглэгчээ үүсгээд эхлээрэй.'
                    }
                  </p>
                  {onCreateUser && !roleFilter && (
                    <Button className="mt-4" onClick={onCreateUser}>
                      Шинэ хэрэглэгч нэмэх
                    </Button>
                  )}
                </div>
              )}

              {/* Pagination */}
              {data && data.pagination.total > limit && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Нийт {data.pagination.total}-с {((page - 1) * limit) + 1}-{Math.min(page * limit, data.pagination.total)} хэрэглэгч харуулж байна
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={!data.pagination.has_prev_page}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Өмнөх
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!data.pagination.has_next_page}
                    >
                      Дараах
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Хэрэглэгч устгах</DialogTitle>
            <DialogDescription>
              Та{' '}
              <span className="font-semibold">{userToDelete?.name}</span> (
              {userToDelete?.email}) хэрэглэгчийг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Цуцлах
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Устгаж байна...
                </>
              ) : (
                'Устгах'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}