// src/app/dashboard/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import DashboardShell from '@/components/DashboardShell';

export default function DashboardPage() {
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace('/');
    }
  }, [token, isLoading, router]);

  if (isLoading || !token) {
    return null;
  }

  return (
    <ErrorBoundary>
      <DashboardShell />
    </ErrorBoundary>
  );
}
