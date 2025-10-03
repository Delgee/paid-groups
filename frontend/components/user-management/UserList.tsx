'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient, userQueryKeys, AllUserRoles, UserSummary } from '@/lib/api/client';
import { formatDistanceToNow } from 'date-fns';

interface UserListProps {
  onCreateUser?: () => void;
}

export function UserList({ onCreateUser }: UserListProps) {
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<AllUserRoles | undefined>();
  const limit = 20;

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
    if (!lastLoginAt) return 'Never';
    return formatDistanceToNow(new Date(lastLoginAt), { addSuffix: true });
  };

  const formatCreatedAt = (createdAt: string) => {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-destructive">Failed to load users</p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage admin and moderator users in your organization
          </p>
        </div>
        {onCreateUser && (
          <Button onClick={onCreateUser} data-testid="create-user-button">
            <Users className="mr-2 h-4 w-4" />
            Create New User
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                {data?.pagination.total ?? 0} total users in your organization
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
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owners</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="moderator">Moderators</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading users...</span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
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
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data?.users.length === 0 && (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No users found</h3>
                  <p className="text-muted-foreground">
                    {roleFilter
                      ? `No ${roleFilter} users found. Try adjusting your filter.`
                      : 'Get started by creating your first user.'
                    }
                  </p>
                  {onCreateUser && !roleFilter && (
                    <Button className="mt-4" onClick={onCreateUser}>
                      Create New User
                    </Button>
                  )}
                </div>
              )}

              {/* Pagination */}
              {data && data.pagination.total > limit && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total)} of {data.pagination.total} users
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={!data.pagination.has_prev_page}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!data.pagination.has_next_page}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}