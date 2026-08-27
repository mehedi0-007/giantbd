'use client';

import { ActiveLcItem } from '@/types/dashboard';
import { formatNumber } from '@/lib/utils';
import { FileText, ArrowRight, ShieldCheck, ShoppingBag } from 'lucide-react';
import NextLink from 'next/link';

interface ActiveLcsFeedProps {
  lcs?: ActiveLcItem[];
  isLoading: boolean;
}

export function ExpiringLcsFeed({ lcs, isLoading }: ActiveLcsFeedProps) {
  if (isLoading || !lcs) {
    return (
      <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs animate-pulse">
        <div className="h-5 w-40 rounded-md bg-slate-100 mb-2" />
        <div className="h-3 w-56 rounded-md bg-slate-100 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-50" />
          ))}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'FULFILLED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs h-full">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Active Letters of Credit
            </h3>
            {lcs.length > 0 && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200/60">
                {lcs.length} Commercial
              </span>
            )}
          </div>
          <NextLink
            href="/commercial/lc"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </NextLink>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Recent active commercial LC contracts with linked buyers
        </p>

        {lcs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
              <FileText className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-800">
              No Active Letters of Credit
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Open a new commercial LC to tie incoming purchase orders.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {lcs.map((lc) => (
              <div
                key={lc.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200/70 bg-slate-50/60 hover:bg-slate-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800 shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 font-mono">
                      {lc.lcNumber}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[140px] sm:max-w-[200px]">
                      Buyer: <strong className="text-slate-700">{lc.buyerName}</strong>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusBadge(
                      lc.status,
                    )}`}
                  >
                    {lc.status}
                  </span>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <ShoppingBag className="h-3 w-3 text-slate-400" />
                    <span>{lc.posCount || 0} Linked POs</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
