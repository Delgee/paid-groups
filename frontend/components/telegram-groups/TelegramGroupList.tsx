'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  Users,
  Bot,
  Wifi,
  WifiOff,
  MoreVertical,
  RefreshCw,
  Settings,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import {
  TelegramGroup,
  ConnectionStatus,
  telegramGroupsApi,
  telegramGroupsQueryKeys,
  ListTelegramGroupsParams,
} from '@/lib/api/telegram-groups';
import { formatDistanceToNow } from 'date-fns';

interface TelegramGroupListProps {
  onEditGroup?: (group: TelegramGroup) => void;
  onDeleteGroup?: (group: TelegramGroup) => void;
  onConnectChannel?: (group: TelegramGroup) => void;
  onSyncGroup?: (group: TelegramGroup) => void;
  className?: string;
}

// Custom hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function TelegramGroupList({
  onEditGroup,
  onDeleteGroup,
  onConnectChannel,
  onSyncGroup,
  className,
}: TelegramGroupListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract URL parameters
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialLimit = parseInt(searchParams.get('limit') || '20', 10);
  const initialSearch = searchParams.get('search') || '';
  const initialSyncEnabled = searchParams.get('sync_enabled');
  const initialBotAssigned = searchParams.get('bot_assigned');
  const initialConnectionStatus = searchParams.get('connection_status') as ConnectionStatus | null;

  // Local state
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [syncEnabledFilter, setSyncEnabledFilter] = useState<boolean | undefined>(
    initialSyncEnabled === 'true' ? true : initialSyncEnabled === 'false' ? false : undefined
  );
  const [botAssignedFilter, setBotAssignedFilter] = useState<boolean | undefined>(
    initialBotAssigned === 'true' ? true : initialBotAssigned === 'false' ? false : undefined
  );
  const [connectionStatusFilter, setConnectionStatusFilter] = useState<ConnectionStatus | undefined>(
    initialConnectionStatus || undefined
  );

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Build query parameters
  const queryParams = useMemo((): ListTelegramGroupsParams => {
    const params: ListTelegramGroupsParams = {
      page,
      limit,
    };

    if (syncEnabledFilter !== undefined) {
      params.sync_enabled = syncEnabledFilter;
    }
    if (botAssignedFilter !== undefined) {
      params.bot_assigned = botAssignedFilter;
    }
    if (connectionStatusFilter) {
      params.connection_status = connectionStatusFilter;
    }

    return params;
  }, [page, limit, syncEnabledFilter, botAssignedFilter, connectionStatusFilter]);

  // Fetch telegram groups
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: telegramGroupsQueryKeys.list(queryParams),
    queryFn: () => telegramGroupsApi.listTelegramGroups(queryParams),
    staleTime: 30 * 1000, // 30 seconds
  });

  // Filter data client-side for search (since API may not support search)
  const filteredGroups = useMemo(() => {
    if (!data?.data || !debouncedSearchTerm) return data?.data || [];

    return data.data.filter(group =>
      group.group_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    );
  }, [data?.data, debouncedSearchTerm]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (page > 1) params.set('page', page.toString());
    if (limit !== 20) params.set('limit', limit.toString());
    if (searchTerm) params.set('search', searchTerm);
    if (syncEnabledFilter !== undefined) params.set('sync_enabled', syncEnabledFilter.toString());
    if (botAssignedFilter !== undefined) params.set('bot_assigned', botAssignedFilter.toString());
    if (connectionStatusFilter) params.set('connection_status', connectionStatusFilter);

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    const currentUrl = window.location.search;

    if (newUrl !== currentUrl) {
      router.replace(`${window.location.pathname}${newUrl}`, { scroll: false });
    }
  }, [page, limit, searchTerm, syncEnabledFilter, botAssignedFilter, connectionStatusFilter, router]);

  // Helper functions
  const getConnectionStatusBadge = (status: ConnectionStatus) => {
    const variants = {
      [ConnectionStatus.PENDING]: { variant: 'secondary' as const, label: 'Pending', icon: AlertCircle },
      [ConnectionStatus.CONNECTED]: { variant: 'default' as const, label: 'Connected', icon: Wifi },
      [ConnectionStatus.FAILED]: { variant: 'destructive' as const, label: 'Failed', icon: WifiOff },
      [ConnectionStatus.DISCONNECTED]: { variant: 'outline' as const, label: 'Disconnected', icon: WifiOff },
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatLastSync = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return 'Never';
    return formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true });
  };

  const handleCreateGroup = () => {
    router.push('/dashboard/telegram-groups/create');
  };

  const resetFilters = () => {
    setPage(1);
    setSearchTerm('');
    setSyncEnabledFilter(undefined);
    setBotAssignedFilter(undefined);
    setConnectionStatusFilter(undefined);
  };

  const hasActiveFilters = searchTerm || syncEnabledFilter !== undefined ||
    botAssignedFilter !== undefined || connectionStatusFilter;

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: limit }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </CardContent>
          <CardFooter>
            <div className="h-8 bg-muted rounded w-20"></div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-destructive font-medium">Failed to load telegram groups</p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Telegram Groups</h1>
          <p className="text-muted-foreground">
            Manage your paid telegram groups and member access
          </p>
        </div>
        <Button onClick={handleCreateGroup} data-testid="create-group-button">
          <Plus className="mr-2 h-4 w-4" />
          Create New Group
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Filter and search your telegram groups
              </CardDescription>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-4">
            {/* Sync Enabled Filter */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="sync-enabled-filter" className="text-sm font-medium">
                Sync Enabled
              </Label>
              <Select
                value={syncEnabledFilter === undefined ? 'all' : syncEnabledFilter.toString()}
                onValueChange={(value) => {
                  setSyncEnabledFilter(value === 'all' ? undefined : value === 'true');
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[120px]" data-testid="sync-enabled-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Enabled</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bot Assigned Filter */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="bot-assigned-filter" className="text-sm font-medium">
                Bot Assigned
              </Label>
              <Select
                value={botAssignedFilter === undefined ? 'all' : botAssignedFilter.toString()}
                onValueChange={(value) => {
                  setBotAssignedFilter(value === 'all' ? undefined : value === 'true');
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[120px]" data-testid="bot-assigned-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Assigned</SelectItem>
                  <SelectItem value="false">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Connection Status Filter */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="connection-status-filter" className="text-sm font-medium">
                Connection Status
              </Label>
              <Select
                value={connectionStatusFilter || 'all'}
                onValueChange={(value) => {
                  setConnectionStatusFilter(value === 'all' ? undefined : value as ConnectionStatus);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]" data-testid="connection-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={ConnectionStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={ConnectionStatus.CONNECTED}>Connected</SelectItem>
                  <SelectItem value={ConnectionStatus.FAILED}>Failed</SelectItem>
                  <SelectItem value={ConnectionStatus.DISCONNECTED}>Disconnected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Items per page */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="limit-select" className="text-sm font-medium">
                Per Page
              </Label>
              <Select
                value={limit.toString()}
                onValueChange={(value) => {
                  setLimit(parseInt(value, 10));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[80px]" data-testid="limit-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Groups Grid */}
      <div>
        {/* Results Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            {isLoading ? (
              'Loading groups...'
            ) : (
              <>
                Showing {filteredGroups.length} of {data?.pagination?.total || 0} groups
                {debouncedSearchTerm && ` matching "${debouncedSearchTerm}"`}
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="refresh-button"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && <LoadingSkeleton />}

        {/* Empty State */}
        {!isLoading && filteredGroups.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-medium">No telegram groups found</h3>
                  <p className="text-muted-foreground">
                    {hasActiveFilters ? (
                      <>
                        No groups match your current filters.{' '}
                        <Button variant="link" className="p-0 h-auto" onClick={resetFilters}>
                          Clear filters
                        </Button>{' '}
                        to see all groups.
                      </>
                    ) : (
                      'Get started by creating your first telegram group.'
                    )}
                  </p>
                </div>
                {!hasActiveFilters && (
                  <Button onClick={handleCreateGroup}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Group
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Groups Grid */}
        {!isLoading && filteredGroups.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="groups-grid">
            {filteredGroups.map((group) => (
              <Card key={group.id} className="relative" data-testid="group-card">
                {/* Group Actions Dropdown */}
                <div className="absolute top-4 right-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid="group-actions-menu">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEditGroup && (
                        <DropdownMenuItem onClick={() => onEditGroup(group)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Edit Group
                        </DropdownMenuItem>
                      )}
                      {onConnectChannel && group.connection_status !== ConnectionStatus.CONNECTED && (
                        <DropdownMenuItem onClick={() => onConnectChannel(group)}>
                          <Wifi className="mr-2 h-4 w-4" />
                          Connect Channel
                        </DropdownMenuItem>
                      )}
                      {onSyncGroup && group.sync_enabled && group.connection_status === ConnectionStatus.CONNECTED && (
                        <DropdownMenuItem onClick={() => onSyncGroup(group)}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Sync Now
                        </DropdownMenuItem>
                      )}
                      {onDeleteGroup && (
                        <DropdownMenuItem
                          onClick={() => onDeleteGroup(group)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Group
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <CardHeader className="pr-12">
                  <CardTitle className="text-lg" data-testid="group-name">
                    {group.group_name}
                  </CardTitle>
                  <CardDescription data-testid="group-description">
                    {group.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Connection Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    {getConnectionStatusBadge(group.connection_status)}
                  </div>

                  {/* Bot Assignment */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Bot</span>
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      <span className="text-sm">
                        {group.bot_assigned ?
                          (group.bot?.bot_name || 'Assigned') :
                          'Not Assigned'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Member Count */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Members</span>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">{group.member_count.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Sync Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sync</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={group.sync_enabled ? 'default' : 'secondary'}>
                        {group.sync_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>

                  {/* Last Sync */}
                  {group.sync_enabled && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Sync</span>
                      <span className="text-sm">{formatLastSync(group.last_sync_at)}</span>
                    </div>
                  )}

                  {/* Sync Errors */}
                  {group.sync_errors && (
                    <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                      <strong>Sync Error:</strong> {group.sync_errors}
                    </div>
                  )}
                </CardContent>

                <CardFooter>
                  <Badge variant={group.is_active ? 'default' : 'secondary'}>
                    {group.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && data && data.pagination && data.pagination.total > limit && (
          <div className="flex items-center justify-between pt-6">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total)} of {data.pagination.total} groups
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={!data.pagination.has_prev_page}
                data-testid="prev-page-button"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, data.pagination.total_pages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(
                    data.pagination.total_pages - 4,
                    Math.max(1, page - 2)
                  )) + i;

                  if (pageNum > data.pagination.total_pages) return null;

                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={!data.pagination.has_next_page}
                data-testid="next-page-button"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}