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
    setAuth,
    logout,
    hasPermission,
  } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const isRefreshingRef = useRef(false);

  // 1. Wait for Zustand persist to hydrate from localStorage
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true);
      return;
    }

    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    return () => {
      unsub();
    };
  }, []);

  // 2. Validate session once storage is rehydrated
  useEffect(() => {
    if (!isHydrated) return;

    async function checkSession() {
      const currentToken = useAuthStore.getState().accessToken;

      // If we already have a valid access token from storage, use it directly!
      // Do NOT call /auth/refresh on page refresh!
      if (currentToken) {
        setIsInitializing(false);
        return;
      }

      // Only attempt silent refresh if we genuinely have no access token in storage
      if (!isRefreshingRef.current) {
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

    checkSession();
  }, [isHydrated, setAuth, logout]);

  // 3. Handle routing & permissions after initialization
  useEffect(() => {
    if (isInitializing || !isHydrated) return;

    if (!isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    } else if (
      isAuthenticated &&
      requiredPermission &&
      !hasPermission(requiredPermission)
    ) {
      router.replace('/');
    }
  }, [isAuthenticated, isInitializing, isHydrated, pathname, router, requiredPermission, hasPermission]);

  if (!isHydrated || isInitializing) {
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
