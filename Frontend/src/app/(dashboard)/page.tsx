'use client';

import { useDashboardData } from '@/hooks/use-dashboard';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { MovementChart } from '@/components/dashboard/movement-chart';
import { PoStatusChart } from '@/components/dashboard/po-status-chart';
import { ExpiringLcsFeed } from '@/components/dashboard/expiring-lcs-feed';
import { PendingChallansFeed } from '@/components/dashboard/pending-challans-feed';
import { RecentStocksFeed } from '@/components/dashboard/recent-stocks-feed';

export default function DashboardPage() {
  const { data, isLoading } = useDashboardData();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
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
