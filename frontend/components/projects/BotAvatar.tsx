import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BotIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BotAvatarProps {
  avatarUrl?: string;
  displayName: string;
  username?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
};

const iconSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function BotAvatar({
  avatarUrl,
  displayName,
  username,
  size = 'md',
  className
}: BotAvatarProps) {
  // Generate initials from display name (first 2 characters)
  const initials = displayName
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl ? (
        <AvatarImage
          src={avatarUrl}
          alt={`${displayName} avatar`}
          className="object-cover"
        />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-primary">
        {initials || <BotIcon className={iconSizeClasses[size]} />}
      </AvatarFallback>
    </Avatar>
  );
}
