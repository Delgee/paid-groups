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
  MoreVertical,
  RefreshCw,
  Settings,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  TelegramGroup,
  telegramGroupsApi,
  telegramGroupsQueryKeys,
  ListTelegramGroupsParams,
} from '@/lib/api/telegram-groups';
import { formatDistanceToNow } from 'date-fns';

interface TelegramGroupListProps {
  onEditGroup?: (group: TelegramGroup) => void;
  onDeleteGroup?: (group: TelegramGroup) => void;
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
  className,
}: TelegramGroupListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract URL parameters
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialLimit = parseInt(searchParams.get('limit') || '20', 10);
  const initialSearch = searchParams.get('search') || '';

  // Local state
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Build query parameters
  const queryParams = useMemo((): ListTelegramGroupsParams => {
    const params: ListTelegramGroupsParams = {
      page,
      limit,
    };

    return params;
  }, [page, limit]);

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

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    const currentUrl = window.location.search;

    if (newUrl !== currentUrl) {
      router.replace(`${window.location.pathname}${newUrl}`, { scroll: false });
    }
  }, [page, limit, searchTerm, router]);

  // Helper function to get connection status badge
  const getConnectionStatusBadge = (group: TelegramGroup) => {
    const isConnected = !!group.telegram_chat_id;

    if (isConnected) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Холбогдсон
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Холбогдоогүй
      </Badge>
    );
  };

  const handleCreateGroup = () => {
    router.push('/dashboard/telegram-groups/create');
  };

  const resetFilters = () => {
    setPage(1);
    setSearchTerm('');
  };

  const hasActiveFilters = searchTerm;

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
            <p className="text-destructive font-medium">Telegram группүүдийг ачаалж чадсангүй</p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Тодорхойгүй алдаа гарлаа'}
            </p>
            <Button onClick={() => refetch()}>Дахин оролдох</Button>
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
          <h1 className="text-3xl font-bold tracking-tight">Telegram Группүүд</h1>
          <p className="text-muted-foreground">
            Төлбөртэй Telegram группүүд болон гишүүдийн хандалтыг удирдах
          </p>
        </div>
        <Button onClick={handleCreateGroup} data-testid="create-group-button">
          <Plus className="mr-2 h-4 w-4" />
          Шинэ групп үүсгэх
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Шүүлтүүр</CardTitle>
              <CardDescription>
                Telegram группүүдээ хайх болон шүүх
              </CardDescription>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Шүүлтүүр цэвэрлэх
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Нэр эсвэл тайлбараар хайх..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-4">
            {/* Items per page */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="limit-select" className="text-sm font-medium">
                Хуудсанд
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
              'Группүүдийг ачаалж байна...'
            ) : (
              <>
                Нийт {data?.pagination?.total || 0}-с {filteredGroups.length} групп харуулж байна
                {debouncedSearchTerm && ` "${debouncedSearchTerm}" хайлтад тохирсон`}
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
            Шинэчлэх
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
                  <h3 className="text-lg font-medium">Telegram групп олдсонгүй</h3>
                  <p className="text-muted-foreground">
                    {hasActiveFilters ? (
                      <>
                        Шүүлтүүрт таарах групп олдсонгүй.{' '}
                        <Button variant="link" className="p-0 h-auto" onClick={resetFilters}>
                          Шүүлтүүр цэвэрлэх
                        </Button>{' '}
                        бүх группүүдийг харах.
                      </>
                    ) : (
                      'Эхний Telegram группоо үүсгээд эхлээрэй.'
                    )}
                  </p>
                </div>
                {!hasActiveFilters && (
                  <Button onClick={handleCreateGroup}>
                    <Plus className="mr-2 h-4 w-4" />
                    Шинэ групп үүсгэх
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
                          Засах
                        </DropdownMenuItem>
                      )}
                      {onDeleteGroup && (
                        <DropdownMenuItem
                          onClick={() => onDeleteGroup(group)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Устгах
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
                    {group.description || 'Тайлбар байхгүй'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Connection Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Төлөв</span>
                    {getConnectionStatusBadge(group)}
                  </div>

                  {/* Member Count */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Гишүүд</span>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">{group.member_count.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Үүсгэсэн</span>
                    <span className="text-sm">{formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}</span>
                  </div>
                </CardContent>

                <CardFooter>
                  <Badge variant={group.is_active ? 'default' : 'secondary'}>
                    {group.is_active ? 'Идэвхитэй' : 'Идэвхгүй'}
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
              Нийт {data.pagination.total}-с {((page - 1) * limit) + 1}-{Math.min(page * limit, data.pagination.total)} групп харуулж байна
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
                Өмнөх
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
                Дараах
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}