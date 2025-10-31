'use client';

import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  Users,
  MoreVertical,
  Settings,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  TelegramGroup,
} from '@/lib/api/telegram-groups';
import { cn } from '@/lib/utils';

interface TelegramGroupCardProps {
  group: TelegramGroup;
  onEdit?: (group: TelegramGroup) => void;
  onDelete?: (group: TelegramGroup) => void;
  variant?: 'default' | 'compact';
  showActions?: boolean;
  className?: string;
}

export function TelegramGroupCard({
  group,
  onEdit,
  onDelete,
  variant = 'default',
  showActions = true,
  className,
}: TelegramGroupCardProps) {
  // Helper function to get connection status badge
  const getConnectionStatusBadge = () => {
    const isConnected = !!group.telegram_chat_id;

    if (isConnected) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Connected
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Not Connected
      </Badge>
    );
  };

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Helper function to generate Telegram URL
  const getTelegramUrl = () => {
    if (group.username) {
      return `https://t.me/${group.username}`;
    }
    return null;
  };

  // Available actions
  const availableActions = useMemo(() => {
    const actions = [];

    // Edit is always available
    if (onEdit) {
      actions.push({
        key: 'edit',
        label: 'Edit Group',
        icon: Settings,
        onClick: () => onEdit(group),
        variant: 'default' as const,
      });
    }

    // View in Telegram if connected
    const telegramUrl = getTelegramUrl();
    if (telegramUrl && group.telegram_chat_id) {
      actions.push({
        key: 'view',
        label: 'View in Telegram',
        icon: ExternalLink,
        onClick: () => window.open(telegramUrl, '_blank'),
        variant: 'default' as const,
      });
    }

    // Delete is always available (with confirmation handled by parent)
    if (onDelete) {
      actions.push({
        key: 'delete',
        label: 'Delete Group',
        icon: Trash2,
        onClick: () => onDelete(group),
        variant: 'destructive' as const,
      });
    }

    return actions;
  }, [group, onEdit, onDelete]);

  const isCompact = variant === 'compact';

  return (
    <Card
      className={cn(
        "relative transition-shadow hover:shadow-md",
        className
      )}
      data-testid="telegram-group-card"
    >
      {/* Actions Menu */}
      {showActions && availableActions.length > 0 && (
        <div className="absolute top-3 right-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                data-testid="group-card-actions-menu"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {availableActions.map((action) => {
                const Icon = action.icon;
                return (
                  <DropdownMenuItem
                    key={action.key}
                    onClick={action.onClick}
                    className={cn(
                      action.variant === 'destructive' &&
                      "text-destructive focus:text-destructive"
                    )}
                    data-testid={`action-${action.key}`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Header Section */}
      <CardHeader className={cn("space-y-2", showActions && "pr-12")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle
              className={cn(
                "truncate",
                isCompact ? "text-base" : "text-lg"
              )}
              data-testid="group-card-name"
              title={group.group_name}
            >
              {group.group_name}
            </CardTitle>
            <CardDescription
              className={cn(
                "mt-1",
                isCompact ? "text-xs" : "text-sm"
              )}
              data-testid="group-card-description"
              title={group.description || 'No description provided'}
            >
              {group.description ?
                truncateText(group.description, isCompact ? 60 : 100) :
                'No description provided'
              }
            </CardDescription>
          </div>
        </div>

        {/* Status Badges Row */}
        <div className="flex flex-wrap gap-2">
          {getConnectionStatusBadge()}
        </div>
      </CardHeader>

      {/* Content Section */}
      <CardContent className="space-y-3">
        {/* Member Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Users className="h-4 w-4" />
            Members
          </span>
          <span className="text-sm font-medium" data-testid="group-card-members">
            {group.member_count.toLocaleString()}
          </span>
        </div>

        {/* Telegram Chat ID (if connected) */}
        {group.telegram_chat_id && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Chat ID</span>
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono" data-testid="group-card-chat-id">
              {group.telegram_chat_id}
            </code>
          </div>
        )}

        {/* Created Date */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Created</span>
          <span className="text-sm" data-testid="group-card-created">
            {formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Group Type and Username (if available) */}
        {!isCompact && (
          <div className="pt-2 border-t border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Type</span>
              <span className="text-xs font-medium capitalize">
                {group.group_type.replace('_', ' ')}
              </span>
            </div>

            {group.username && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Username</span>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  @{group.username}
                </code>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Footer Section */}
      <CardFooter className="flex items-center justify-between">
        <Badge
          variant={group.is_active ? 'default' : 'secondary'}
          data-testid="group-card-status"
        >
          {group.is_active ? 'Active' : 'Inactive'}
        </Badge>

        {/* Quick Action Buttons for Compact Mode */}
        {isCompact && showActions && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onEdit(group)}
                title="Edit Group"
              >
                <Settings className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}