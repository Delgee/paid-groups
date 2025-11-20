'use client';

import { useEffect, useCallback, useMemo } from 'react';
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
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
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
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Default dashboard keyboard shortcuts
 */
export function useDashboardShortcuts() {
  const router = useRouter();

  const shortcuts = useMemo<KeyboardShortcut[]>(() => [
    {
      key: 'h',
      ctrl: true,
      action: () => router.push('/dashboard'),
      description: 'Нүүр хуудас руу очих',
    },
    {
      key: 'p',
      ctrl: true,
      action: () => router.push('/dashboard/projects'),
      description: 'Төслүүд рүү очих',
    },
    {
      key: 'n',
      ctrl: true,
      action: () => router.push('/dashboard/projects/create'),
      description: 'Шинэ төсөл үүсгэх',
    },
    {
      key: 'g',
      ctrl: true,
      action: () => router.push('/dashboard/telegram-groups'),
      description: 'Telegram группүүд рүү очих',
    },
    {
      key: 'u',
      ctrl: true,
      action: () => router.push('/dashboard/users'),
      description: 'Хэрэглэгч удирдлага руу очих',
    },
    {
      key: 'm',
      ctrl: true,
      action: () => router.push('/dashboard/members'),
      description: 'Гишүүд рүү очих',
    },
    {
      key: ',',
      ctrl: true,
      action: () => router.push('/dashboard/settings'),
      description: 'Тохиргоо руу очих',
    },
  ], [router]);

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}
