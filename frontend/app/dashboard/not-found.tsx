'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, ArrowLeft, FileQuestion, Layers } from 'lucide-react';

/**
 * Dashboard 404 Not Found Page
 *
 * This page is displayed when a user navigates to a dashboard route that doesn't exist.
 * Maintains the dashboard layout and provides navigation to valid dashboard pages.
 */
export default function DashboardNotFound() {
  const router = useRouter();

  const quickLinks = [
    { name: 'Dashboard Home', href: '/dashboard', icon: Home },
    { name: 'Projects', href: '/dashboard/projects', icon: Layers },
    { name: 'Telegram Groups', href: '/dashboard/telegram-groups', icon: FileQuestion },
  ];

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-16rem)]">
      <Card className="max-w-2xl w-full shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center">
            <FileQuestion className="w-10 h-10 text-white" />
          </div>

          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold text-gray-900">
              Page Not Found
            </CardTitle>
            <CardDescription className="text-base text-gray-600">
              This dashboard page does not exist or you may not have access to it.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              <strong>Need help?</strong> The page you are trying to access may have been moved, deleted, or you may not have the necessary permissions.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-700 font-medium">Quick navigation:</p>

            <div className="space-y-2">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href} className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    data-testid={`quick-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <link.icon className="mr-2 h-4 w-4" />
                    {link.name}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="default"
              className="flex-1"
              onClick={() => router.back()}
              data-testid="go-back-button"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>

            <Link href="/dashboard" className="flex-1">
              <Button
                variant="secondary"
                className="w-full"
                data-testid="dashboard-home-button"
              >
                <Home className="mr-2 h-4 w-4" />
                Dashboard Home
              </Button>
            </Link>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              If you believe you should have access to this page, please contact your administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
