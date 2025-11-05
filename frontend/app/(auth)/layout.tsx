'use client';

import React, { useEffect, ReactNode } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Always render the same container structure to prevent unmounting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Telegram Групп Удирдлага
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Төлбөртэй Telegram группүүдээ хялбараар удирдаарай
          </p>
        </div>
        {/* Show loading overlay if loading, otherwise show children */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : isAuthenticated ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-600">Шилжүүлж байна...</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}