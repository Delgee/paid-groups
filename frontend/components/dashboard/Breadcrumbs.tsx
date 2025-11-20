'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { navigationItems } from './DashboardSidebar';

interface BreadcrumbItem {
  label: string;
  href: string;
}

export function Breadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // Strip query parameters
    const cleanPath = pathname.split('?')[0];
    const paths = cleanPath.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with home
    breadcrumbs.push({
      label: 'Нүүр',
      href: '/dashboard',
    });

    // Skip if we're on the dashboard home
    if (cleanPath === '/dashboard') {
      return breadcrumbs;
    }

    let currentPath = '';
    const MAX_BREADCRUMB_DEPTH = 5; // Limit to prevent overflow

    paths.forEach((path, index) => {
      // Skip 'dashboard' as it's the home
      if (path === 'dashboard') {
        return;
      }

      // Limit breadcrumb depth
      if (breadcrumbs.length >= MAX_BREADCRUMB_DEPTH) {
        return;
      }

      currentPath += `/${path}`;
      const fullPath = `/dashboard${currentPath}`;

      // Try to find matching navigation item
      const navItem = navigationItems.find(item => item.href === fullPath);

      if (navItem) {
        breadcrumbs.push({
          label: navItem.name,
          href: navItem.href,
        });
      } else {
        // Handle dynamic routes like [id], create, edit
        let label = path;
        let href = fullPath;

        if (path === 'create') {
          label = 'Шинэ';
        } else if (path === 'edit') {
          label = 'Засах';
        } else if (path.match(/^[0-9a-f-]{36}$/i)) {
          // UUID pattern - show as "Дэлгэрэнгүй"
          // Don't make it clickable (same page)
          label = 'Дэлгэрэнгүй';
          href = ''; // Empty href means non-clickable
        } else {
          // Capitalize first letter
          label = path.charAt(0).toUpperCase() + path.slice(1);
        }

        breadcrumbs.push({
          label,
          href,
        });
      }
    });

    return breadcrumbs;
  }, [pathname]);

  // Don't show breadcrumbs if only home
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-gray-600 mb-4" aria-label="Breadcrumb">
      {breadcrumbs.map((breadcrumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <div key={breadcrumb.href} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
            )}

            {index === 0 && (
              <Home className="h-4 w-4 mr-1" />
            )}

            {isLast || !breadcrumb.href ? (
              <span className="font-medium text-gray-900" aria-current={isLast ? 'page' : undefined}>
                {breadcrumb.label}
              </span>
            ) : (
              <Link
                href={breadcrumb.href}
                className="hover:text-blue-600 transition-colors"
              >
                {breadcrumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
