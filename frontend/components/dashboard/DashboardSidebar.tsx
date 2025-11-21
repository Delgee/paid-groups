'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Home,
  Users,
  CreditCard,
  Settings,
  UserPlus,
  MessageSquare,
  FolderKanban,
  Wallet,
  LucideIcon,
} from 'lucide-react';
import packageJson from '@/../package.json';

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  testId?: string;
}

export const navigationItems: NavigationItem[] = [
  { name: 'Хяналтын самбар', href: '/dashboard', icon: Home },
  { name: 'Төслүүд', href: '/dashboard/projects', icon: FolderKanban },
  { name: 'Telegram Группүүд', href: '/dashboard/telegram-groups', icon: MessageSquare, testId: 'telegram-groups-nav' },
  { name: 'Гишүүд', href: '/dashboard/members', icon: Users },
  { name: 'Хэрэглэгч удирдлага', href: '/dashboard/users', icon: UserPlus, testId: 'user-management-nav' },
  { name: 'Багцууд', href: '/dashboard/plans', icon: CreditCard },
  { name: 'Төлбөр', href: '/dashboard/payments', icon: Wallet },
  { name: 'Тайлан', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Тохиргоо', href: '/dashboard/settings', icon: Settings },
];

interface DashboardSidebarProps {
  onNavigate?: () => void;
  isMobile?: boolean;
}

export function DashboardSidebar({ onNavigate, isMobile = false }: DashboardSidebarProps) {
  const pathname = usePathname();

  const isActiveRoute = (itemHref: string) => {
    // Exact match for dashboard home
    if (itemHref === '/dashboard') {
      return pathname === '/dashboard';
    }
    // For other routes, check if pathname starts with the route
    return pathname.startsWith(itemHref);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        {/* Logo/Brand */}
        <div className="flex items-center flex-shrink-0 px-4 mb-2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Telegram Групп
          </h1>
        </div>

        {/* Navigation */}
        <nav className={`mt-5 flex-1 px-2 bg-white space-y-1 ${isMobile ? 'space-y-1' : ''}`}>
          {navigationItems.map((item) => {
            const isActive = isActiveRoute(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                data-testid={item.testId}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  group flex items-center px-3 py-2.5 rounded-lg transition-all duration-150
                  ${isMobile ? 'text-base font-medium' : 'text-sm font-medium'}
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
                onClick={onNavigate}
              >
                <item.icon
                  className={`
                    mr-3 flex-shrink-0 h-5 w-5 transition-colors
                    ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                  `}
                />
                <span className="flex-1">{item.name}</span>
                {isActive && (
                  <div className="w-1 h-6 bg-blue-600 rounded-full ml-auto" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer - Version or Help Info */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            v{packageJson.version} • Telegram Groups SaaS
          </p>
        </div>
      </div>
    </div>
  );
}
