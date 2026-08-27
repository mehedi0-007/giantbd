'use client';

import { useAuthStore } from '@/store/auth.store';
import { useDashboardData } from '@/hooks/use-dashboard';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { MovementChart } from '@/components/dashboard/movement-chart';
import { PoStatusChart } from '@/components/dashboard/po-status-chart';
import { ExpiringLcsFeed } from '@/components/dashboard/expiring-lcs-feed';
import { PendingChallansFeed } from '@/components/dashboard/pending-challans-feed';
import { RecentStocksFeed } from '@/components/dashboard/recent-stocks-feed';
import { RotateCw } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading, refetch, isRefetching } = useDashboardData();

  const currentDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Dashboard Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Operations Dashboard
            </h1>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              Live Overview
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Welcome back, <strong className="font-semibold text-slate-700">{user?.name}</strong> • Today is {currentDate}
          </p>
        </div>

        {/* Refresh Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-60 cursor-pointer"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{isRefetching ? 'Syncing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* 1. Top KPI Cards Row */}
      <KpiCards kpi={data?.kpi} isLoading={isLoading} />

      {/* 2. Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <MovementChart data={data?.movementTrends} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-5">
          <PoStatusChart data={data?.poDistribution} isLoading={isLoading} />
        </div>
      </div>

      {/* 3. Action Feeds Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpiringLcsFeed lcs={data?.activeLcs} isLoading={isLoading} />
        <PendingChallansFeed challans={data?.pendingChallans} isLoading={isLoading} />
      </div>

      {/* 4. Recent Stocks Feed */}
      <RecentStocksFeed stocks={data?.recentStocks} isLoading={isLoading} />
    </div>
  );
}
