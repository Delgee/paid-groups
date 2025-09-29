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
  Bot,
  Users,
  Wifi,
  WifiOff,
  AlertCircle,
  MoreVertical,
  RefreshCw,
  Settings,
  Trash2,
  ExternalLink,
  Clock,
} from 'lucide-react';
import {
  TelegramGroup,
  ConnectionStatus,
} from '@/lib/api/telegram-groups';
import { cn } from '@/lib/utils';

interface TelegramGroupCardProps {
  group: TelegramGroup;
  onEdit?: (group: TelegramGroup) => void;
  onDelete?: (group: TelegramGroup) => void;
  onConnectChannel?: (group: TelegramGroup) => void;
  onSyncGroup?: (group: TelegramGroup) => void;
  variant?: 'default' | 'compact';
  showActions?: boolean;
  className?: string;
}

export function TelegramGroupCard({
  group,
  onEdit,
  onDelete,
  onConnectChannel,
  onSyncGroup,
  variant = 'default',
  showActions = true,
  className,
}: TelegramGroupCardProps) {
  // Helper function to get connection status badge configuration
  const getConnectionStatusBadge = (status: ConnectionStatus) => {
    const variants = {
      [ConnectionStatus.PENDING]: {
        variant: 'secondary' as const,
        label: 'Pending',
        icon: AlertCircle,
        className: 'bg-amber-100 text-amber-800 border-amber-200'
      },
      [ConnectionStatus.CONNECTED]: {
        variant: 'default' as const,
        label: 'Connected',
        icon: Wifi,
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      [ConnectionStatus.FAILED]: {
        variant: 'destructive' as const,
        label: 'Failed',
        icon: WifiOff,
        className: 'bg-red-100 text-red-800 border-red-200'
      },
      [ConnectionStatus.DISCONNECTED]: {
        variant: 'outline' as const,
        label: 'Disconnected',
        icon: WifiOff,
        className: 'bg-gray-100 text-gray-600 border-gray-200'
      },
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={cn("flex items-center gap-1", config.className)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Helper function to format last sync time
  const formatLastSync = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return 'Never';
    return formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true });
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
    if (group.invite_link) {
      return group.invite_link;
    }
    return null;
  };

  // Available actions based on group state
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

    // Connect channel if not connected
    if (onConnectChannel && group.connection_status !== ConnectionStatus.CONNECTED) {
      actions.push({
        key: 'connect',
        label: 'Connect Channel',
        icon: Wifi,
        onClick: () => onConnectChannel(group),
        variant: 'default' as const,
      });
    }

    // Sync if connected and sync enabled
    if (onSyncGroup && group.sync_enabled && group.connection_status === ConnectionStatus.CONNECTED) {
      actions.push({
        key: 'sync',
        label: 'Sync Now',
        icon: RefreshCw,
        onClick: () => onSyncGroup(group),
        variant: 'default' as const,
      });
    }

    // View in Telegram if connected
    const telegramUrl = getTelegramUrl();
    if (telegramUrl && group.connection_status === ConnectionStatus.CONNECTED) {
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
  }, [group, onEdit, onDelete, onConnectChannel, onSyncGroup]);

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
          {getConnectionStatusBadge(group.connection_status)}

          {group.sync_enabled && (
            <Badge
              variant="default"
              className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Sync Enabled
            </Badge>
          )}

          {group.bot_assigned && (
            <Badge
              variant="default"
              className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1"
            >
              <Bot className="h-3 w-3" />
              Bot Assigned
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* Content Section */}
      <CardContent className="space-y-3">
        {/* Bot Information */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Bot className="h-4 w-4" />
            Bot
          </span>
          <span className="text-sm font-medium" data-testid="group-card-bot">
            {group.bot_assigned ?
              (group.bot?.bot_name || group.bot?.bot_username || 'Assigned') :
              'Not Assigned'
            }
          </span>
        </div>

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

        {/* Last Sync Time */}
        {group.sync_enabled && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Last Sync
            </span>
            <span className="text-sm" data-testid="group-card-last-sync">
              {formatLastSync(group.last_sync_at)}
            </span>
          </div>
        )}

        {/* Sync Errors */}
        {group.sync_errors && (
          <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
            <div className="flex items-start gap-1">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Sync Error:</strong>
                <p className="mt-1">{group.sync_errors}</p>
              </div>
            </div>
          </div>
        )}

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

            {onConnectChannel && group.connection_status !== ConnectionStatus.CONNECTED && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onConnectChannel(group)}
                title="Connect Channel"
              >
                <Wifi className="h-3 w-3" />
              </Button>
            )}

            {onSyncGroup && group.sync_enabled && group.connection_status === ConnectionStatus.CONNECTED && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onSyncGroup(group)}
                title="Sync Now"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}