'use client';

import { useAuthStore } from '@/store/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export function AuthGuard({ children, requiredPermission }: AuthGuardProps) {
  const {
    isAuthenticated,
    accessToken,
    setAuth,
    logout,
    hasPermission,
  } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isInitializing, setIsInitializing] = useState(true);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    async function initSession() {
      // If we don't have an in-memory access token, try a silent refresh via httpOnly cookie
      if (!accessToken && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        try {
          const res = await api.post('/auth/refresh');
          const data = res.data?.data || res.data;
          if (data?.accessToken && data?.user) {
            setAuth(data.user, data.accessToken);
          } else {
            logout();
          }
        } catch {
          logout();
        } finally {
          isRefreshingRef.current = false;
          setIsInitializing(false);
        }
      } else {
        setIsInitializing(false);
      }
    }

    initSession();
  }, [accessToken, setAuth, logout]);

  useEffect(() => {
    if (isInitializing) return;

    if (!isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    } else if (
      isAuthenticated &&
      requiredPermission &&
      !hasPermission(requiredPermission)
    ) {
      router.replace('/');
    }
  }, [isAuthenticated, isInitializing, pathname, router, requiredPermission, hasPermission]);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-500">
            Securing Giant BD Session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}
