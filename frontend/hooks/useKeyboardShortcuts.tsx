'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

/**
 * Hook for registering keyboard shortcuts in the dashboard
 * Usage:
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: 'p', ctrl: true, action: () => router.push('/dashboard/projects/create'), description: 'Create project' }
 * ]);
 * ```
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          shiftMatch &&
          altMatch
        ) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Default dashboard keyboard shortcuts
 */
export function useDashboardShortcuts() {
  const router = useRouter();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'h',
      ctrl: true,
      action: () => router.push('/dashboard'),
      description: 'Go to dashboard home',
    },
    {
      key: 'p',
      ctrl: true,
      action: () => router.push('/dashboard/projects'),
      description: 'Go to projects',
    },
    {
      key: 'n',
      ctrl: true,
      action: () => router.push('/dashboard/projects/create'),
      description: 'Create new project',
    },
    {
      key: 'g',
      ctrl: true,
      action: () => router.push('/dashboard/telegram-groups'),
      description: 'Go to Telegram groups',
    },
    {
      key: 'u',
      ctrl: true,
      action: () => router.push('/dashboard/users'),
      description: 'Go to user management',
    },
    {
      key: 'm',
      ctrl: true,
      action: () => router.push('/dashboard/members'),
      description: 'Go to members',
    },
    {
      key: ',',
      ctrl: true,
      action: () => router.push('/dashboard/settings'),
      description: 'Go to settings',
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}
