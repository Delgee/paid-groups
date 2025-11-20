'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
}

const shortcuts: Shortcut[] = [
  { key: '?', description: 'Гарын товчлууруудыг харуулах' },
  { key: 'H', ctrl: true, description: 'Нүүр хуудас руу очих' },
  { key: 'P', ctrl: true, description: 'Төслүүд рүү очих' },
  { key: 'N', ctrl: true, description: 'Шинэ төсөл үүсгэх' },
  { key: 'G', ctrl: true, description: 'Telegram группүүд рүү очих' },
  { key: 'U', ctrl: true, description: 'Хэрэглэгч удирдлага руу очих' },
  { key: 'M', ctrl: true, description: 'Гишүүд рүү очих' },
  { key: ',', ctrl: true, description: 'Тохиргоо руу очих' },
];

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Open help with '?' key (Shift + /)
      if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
        const target = event.target as HTMLElement;
        // Don't trigger in input fields
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }
        event.preventDefault();
        setOpen(true);
      }

      // Close with Escape
      if (event.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const formatShortcut = (shortcut: Shortcut) => {
    const keys = [];

    if (shortcut.ctrl) {
      keys.push(
        <kbd key="ctrl" className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
          Ctrl
        </kbd>
      );
    }
    if (shortcut.shift) {
      keys.push(
        <kbd key="shift" className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
          Shift
        </kbd>
      );
    }
    if (shortcut.alt) {
      keys.push(
        <kbd key="alt" className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
          Alt
        </kbd>
      );
    }

    keys.push(
      <kbd key="main" className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
        {shortcut.key}
      </kbd>
    );

    return (
      <div className="flex items-center space-x-1">
        {keys.map((key, i) => (
          <span key={i} className="flex items-center">
            {i > 0 && <span className="mx-1 text-gray-400">+</span>}
            {key}
          </span>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50 md:block hidden"
        title="Keyboard shortcuts (?)"
        aria-label="Show keyboard shortcuts (Press ?)"
        aria-expanded={open}
      >
        <Keyboard className="h-5 w-5" />
      </button>

      {/* Help Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <Keyboard className="h-6 w-6 mr-2 text-blue-600" />
              Гарын товчлуурууд
            </DialogTitle>
            <DialogDescription>
              Хурдан үйлдэл хийхэд ашигладаг товчлууруудын жагсаалт
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-700">{shortcut.description}</span>
                  {formatShortcut(shortcut)}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Товчлууруудыг ашиглахдаа оруулах талбар дээр биш байх ёстой
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
