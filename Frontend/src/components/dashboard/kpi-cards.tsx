'use client';

import { KpiMetrics } from '@/types/dashboard';
import { formatNumber } from '@/lib/utils';
import {
  Layers,
  ShoppingBag,
  FileText,
  ArrowLeftRight,
  AlertTriangle,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import NextLink from 'next/link';

interface KpiCardsProps {
  kpi?: KpiMetrics;
  isLoading: boolean;
}

export function KpiCards({ kpi, isLoading }: KpiCardsProps) {
  if (isLoading || !kpi) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded-md bg-slate-100" />
              <div className="h-9 w-9 rounded-xl bg-slate-100" />
            </div>
            <div className="mt-4 h-7 w-28 rounded-md bg-slate-100" />
            <div className="mt-2 h-3 w-36 rounded-md bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Shippable Stock',
      value: `${formatNumber(kpi.totalStockPairs)} pairs`,
      subtitle:
        kpi.lowStockCount > 0 ? (
          <span className="inline-flex items-center gap-1 font-medium text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {kpi.lowStockCount} {kpi.lowStockCount === 1 ? 'item' : 'items'} &lt; 30 pairs
          </span>
        ) : (
          <span className="text-emerald-700 font-medium">All variants well-stocked</span>
        ),
      badgeBg: kpi.lowStockCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200',
      icon: Layers,
      iconColor: 'bg-emerald-600 shadow-emerald-500/20 text-white',
      link: '/inventory/stock',
    },
    {
      title: 'Active Purchase Orders',
      value: formatNumber(kpi.activePoCount),
      subtitle: (
        <span className="text-slate-600">
          <strong className="font-semibold text-blue-700">{kpi.poFulfillmentRate}%</strong> overall fulfilled
        </span>
      ),
      badgeBg: 'bg-blue-50 border-blue-200',
      icon: ShoppingBag,
      iconColor: 'bg-blue-600 shadow-blue-500/20 text-white',
      link: '/commercial/po',
    },
    {
      title: 'Expiring Letters of Credit',
      value: `${kpi.expiringLcsCount} LCs`,
      subtitle:
        kpi.urgentLcsCount > 0 ? (
          <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
            <Flame className="h-3.5 w-3.5 animate-bounce" />
            {kpi.urgentLcsCount} expiring in &le; 15 days
          </span>
        ) : kpi.expiringLcsCount > 0 ? (
          <span className="text-amber-700 font-medium">Expiring within 30 days</span>
        ) : (
          <span className="text-slate-500">No LCs expiring soon</span>
        ),
      badgeBg: kpi.urgentLcsCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200',
      icon: FileText,
      iconColor: 'bg-amber-600 shadow-amber-500/20 text-white',
      link: '/commercial/lc',
    },
    {
      title: "Today's Activity",
      value: `${kpi.todayStockInBatches + kpi.todayStockOutChallans} Ops`,
      subtitle: (
        <span className="text-slate-600">
          <span className="font-semibold text-emerald-700">+{kpi.todayStockInBatches}</span> In •{' '}
          <span className="font-semibold text-rose-700">-{kpi.todayStockOutChallans}</span> Out
        </span>
      ),
      badgeBg: 'bg-indigo-50 border-indigo-200',
      icon: ArrowLeftRight,
      iconColor: 'bg-indigo-600 shadow-indigo-500/20 text-white',
      link: '/inventory/movements',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <NextLink
            key={idx}
            href={card.link}
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {card.title}
                </span>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-105 ${card.iconColor}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                  {card.value}
                </h3>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <div className="truncate">{card.subtitle}</div>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0 ml-1" />
            </div>
          </NextLink>
        );
      })}
    </div>
  );
}
