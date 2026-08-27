'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0, // Always treat data as fresh-needed upon navigation
            refetchOnMount: 'always', // Always fetch latest real-time data when opening any page
            refetchOnWindowFocus: true, // Auto refetch when user switches tabs/windows
            retry: (failureCount, error: any) => {
              // Do not retry 401, 403 or 404
              if ([401, 403, 404].includes(error?.response?.status)) {
                return false;
              }
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
