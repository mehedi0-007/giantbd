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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Signature Enterprise Hero Greeting Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#3b66b7] text-white p-6 sm:p-8 shadow-xl shadow-[#3b66b7]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Operations Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Welcome back, {user?.name || 'Administrator'}
          </h1>
          <p className="text-xs sm:text-sm text-white/80 font-normal max-w-xl">
            Real-time warehouse stock, purchase order fulfillment & commercial status • Today is {currentDate}
          </p>
        </div>

        {/* Refresh Action Button */}
        <div className="relative z-10 flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-2 rounded-xl bg-white text-[#3b66b7] px-4 py-2.5 text-xs font-bold shadow-md hover:bg-slate-50 transition active:scale-95 disabled:opacity-75 cursor-pointer"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin text-[#3b66b7]' : 'text-[#3b66b7]'}`} />
            <span>{isRefetching ? 'Syncing...' : 'Refresh Live Metrics'}</span>
          </button>
        </div>

        {/* Decorative Ambient Background Rings */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -top-12 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-xl pointer-events-none" />
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
