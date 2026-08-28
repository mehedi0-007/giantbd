'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardData } from '@/types/dashboard';

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard-data'],
    queryFn: async () => {
      const res = await api.get('/dashboard/metrics');
      return res.data?.data || res.data;
    },
    staleTime: 30 * 1000, // 30 seconds cache TTL
    refetchOnWindowFocus: true,
  });
}
