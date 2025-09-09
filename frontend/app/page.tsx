'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bot, CreditCard, Users, BarChart3 } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to dashboard
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="relative px-4 pt-16 pb-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Telegram Groups
              <span className="text-blue-600"> SaaS Platform</span>
            </h1>
            <p className="mt-6 text-xl leading-8 text-gray-600 max-w-3xl mx-auto">
              Manage your paid Telegram groups with automated payment processing,
              member lifecycle management, and comprehensive analytics - all in one platform.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button asChild size="lg">
                <Link href="/register">
                  Get Started
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mx-auto max-w-7xl px-4 pb-32 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <Bot className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Bot Management
            </h3>
            <p className="text-gray-600">
              Create and manage custom Telegram bots for your groups with ease.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Payment Processing
            </h3>
            <p className="text-gray-600">
              Automated payment processing with QPay Mongolia integration.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Member Management
            </h3>
            <p className="text-gray-600">
              Automatic member lifecycle and expiration handling.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mb-4">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Analytics
            </h3>
            <p className="text-gray-600">
              Comprehensive analytics and revenue tracking for your business.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-32 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Ready to get started?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of creators who are already monetizing their Telegram groups
            with our powerful SaaS platform.
          </p>
          <div className="flex items-center justify-center gap-x-6">
            <Button asChild size="lg">
              <Link href="/register">
                Create Account
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">
                I have an account
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}