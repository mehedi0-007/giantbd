'use client';

import React, { useMemo } from 'react';
import { MovementLogItem } from '@/types/dashboard';
import { formatNumber } from '@/lib/utils';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface MovementKpiCardsProps {
  movements?: MovementLogItem[];
  isLoading: boolean;
}

interface PeriodMetrics {
  title: string;
  pairs: number;
  bat: number;
  mas: number;
  var: number;
}

export function MovementKpiCards({ movements = [], isLoading }: MovementKpiCardsProps) {
  const { inPeriods, outPeriods } = useMemo(() => {
    const now = new Date();

    // 1. Calendar Day (Today: 00:00:00 to 23:59:59)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 2. Calendar Week (Monday to Sunday)
    const dayOfWeek = now.getDay();
    const distToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distToMonday, 0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6, 23, 59, 59, 999);

    // 3. Calendar Month (1st to end of current month)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 4. Calendar Year (Jan 1st to Dec 31st of current year)
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    // Filter helper
    const calculateMetrics = (items: MovementLogItem[]): { pairs: number; bat: number; mas: number; var: number } => {
      let pairs = 0;
      const batSet = new Set<string>();
      const masSet = new Set<string>();
      const varSet = new Set<string>();

      for (const item of items) {
        pairs += item.pairs || 0;
        if (item.batchId) batSet.add(item.batchId);
        if (item.masterId) masSet.add(item.masterId);
        if (item.variantId) varSet.add(item.variantId);
      }

      return {
        pairs,
        bat: batSet.size,
        mas: masSet.size,
        var: varSet.size,
      };
    };

    const getPeriodItems = (type: 'IN' | 'OUT', startDate?: Date, endDate?: Date) => {
      return movements.filter((m) => {
        if (m.type !== type) return false;
        if (!startDate || !endDate) return true;
        const d = new Date(m.date);
        return d >= startDate && d <= endDate;
      });
    };

    // Calculate Inward Movements
    const inPeriods: PeriodMetrics[] = [
      {
        title: 'Daily In',
        ...calculateMetrics(getPeriodItems('IN', startOfDay, endOfDay)),
      },
      {
        title: 'Weekly In',
        ...calculateMetrics(getPeriodItems('IN', startOfWeek, endOfWeek)),
      },
      {
        title: 'Monthly In',
        ...calculateMetrics(getPeriodItems('IN', startOfMonth, endOfMonth)),
      },
      {
        title: 'Yearly In',
        ...calculateMetrics(getPeriodItems('IN', startOfYear, endOfYear)),
      },
      {
        title: 'Total In',
        ...calculateMetrics(getPeriodItems('IN')),
      },
    ];

    // Calculate Outward Movements
    const outPeriods: PeriodMetrics[] = [
      {
        title: 'Daily Out',
        ...calculateMetrics(getPeriodItems('OUT', startOfDay, endOfDay)),
      },
      {
        title: 'Weekly Out',
        ...calculateMetrics(getPeriodItems('OUT', startOfWeek, endOfWeek)),
      },
      {
        title: 'Monthly Out',
        ...calculateMetrics(getPeriodItems('OUT', startOfMonth, endOfMonth)),
      },
      {
        title: 'Yearly Out',
        ...calculateMetrics(getPeriodItems('OUT', startOfYear, endOfYear)),
      },
      {
        title: 'Total Out',
        ...calculateMetrics(getPeriodItems('OUT')),
      },
    ];

    return { inPeriods, outPeriods };
  }, [movements]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* IN Skeletons */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={`in-skel-${i}`} className="card-giant p-4.5 rounded-3xl animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 bg-slate-100 rounded-md" />
                <div className="h-5 w-5 bg-slate-100 rounded-full" />
              </div>
              <div className="h-7 w-28 bg-slate-100 rounded-md" />
              <div className="h-3.5 w-32 bg-slate-100 rounded-md" />
            </div>
          ))}
        </div>

        {/* OUT Skeletons */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={`out-skel-${i}`} className="card-giant p-4.5 rounded-3xl animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 bg-slate-100 rounded-md" />
                <div className="h-5 w-5 bg-slate-100 rounded-full" />
              </div>
              <div className="h-7 w-28 bg-slate-100 rounded-md" />
              <div className="h-3.5 w-32 bg-slate-100 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. INWARD MOVEMENT CARDS ROW */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {inPeriods.map((period) => (
          <div
            key={period.title}
            className="card-giant relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#3b66b7]/30"
          >
            {/* Top row: Title and Down Arrow */}
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold tracking-tight text-slate-800">
                {period.title}
              </span>
              <ArrowUp className="h-5 w-5 text-emerald-500 stroke-[2.5]" />
            </div>

            {/* Middle: Prominent Count */}
            <div className="mt-4">
              <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">
                {formatNumber(period.pairs)} Pairs
              </h3>
            </div>

            {/* Bottom Breakdown: Bat | Mas | Var */}
            <div className="mt-1.5 text-xs text-slate-500 font-medium">
              <span>{period.bat} Bat</span>
              <span className="mx-1.5 text-slate-300">|</span>
              <span>{period.mas} Mas</span>
              <span className="mx-1.5 text-slate-300">|</span>
              <span>{period.var} Var</span>
            </div>
          </div>
        ))}
      </div>

      {/* 2. OUTWARD MOVEMENT CARDS ROW */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {outPeriods.map((period) => (
          <div
            key={period.title}
            className="card-giant relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-rose-300/60"
          >
            {/* Top row: Title and Up Arrow */}
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold tracking-tight text-slate-800">
                {period.title}
              </span>
              <ArrowDown className="h-5 w-5 text-rose-500 stroke-[2.5]" />
            </div>

            {/* Middle: Prominent Count */}
            <div className="mt-4">
              <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">
                {formatNumber(period.pairs)} Pairs
              </h3>
            </div>

            {/* Bottom Breakdown: Bat | Mas | Var */}
            <div className="mt-1.5 text-xs text-slate-500 font-medium">
              <span>{period.bat} Bat</span>
              <span className="mx-1.5 text-slate-300">|</span>
              <span>{period.mas} Mas</span>
              <span className="mx-1.5 text-slate-300">|</span>
              <span>{period.var} Var</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
