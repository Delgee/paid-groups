'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, ArrowLeft, Search } from 'lucide-react';

/**
 * Custom 404 Not Found Page
 *
 * This page is displayed when a user navigates to a route that doesn't exist.
 * Provides helpful navigation options to get the user back on track.
 */
export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-lg">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <Search className="w-12 h-12 text-white" />
          </div>

          <div className="space-y-2">
            <CardTitle className="text-4xl font-bold text-gray-900">
              404 - Page Not Found
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              The page you are looking for does not exist or has been moved.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>What happened?</strong> The URL you entered may be incorrect, or the page may have been removed or renamed.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-700 font-medium">Here are some helpful links:</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/dashboard" className="block">
                <Button
                  variant="default"
                  className="w-full"
                  data-testid="go-to-dashboard-button"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              </Link>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.back()}
                data-testid="go-back-button"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </div>

            <Link href="/" className="block">
              <Button
                variant="ghost"
                className="w-full"
                data-testid="go-to-home-button"
              >
                Return to Home
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              If you believe this is an error, please contact support or try refreshing the page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
