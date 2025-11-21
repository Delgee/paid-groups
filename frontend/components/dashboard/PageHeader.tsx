'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                <Icon className="h-6 w-6 text-blue-600" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {description && (
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              )}
            </div>
          </div>
        </div>

        {actions && (
          <div className="flex items-center space-x-3 ml-4">
            {actions}
          </div>
        )}
      </div>

      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
}
