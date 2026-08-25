'use client';

import { ExpiringLc } from '@/types/dashboard';
import { formatDate } from '@/lib/utils';
import { FileText, Flame, ArrowRight, ShieldCheck } from 'lucide-react';
import NextLink from 'next/link';

interface ExpiringLcsFeedProps {
  lcs?: ExpiringLc[];
  isLoading: boolean;
}

export function ExpiringLcsFeed({ lcs, isLoading }: ExpiringLcsFeedProps) {
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

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs h-full">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              LC Expiry Alerts
            </h3>
            {lcs.length > 0 && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                {lcs.length} Action Needed
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
          Letters of credit approaching deadline (within 30 days)
        </p>

        {lcs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-800">
              No LCs Expiring Soon
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              All commercial letters of credit are in good standing.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {lcs.map((lc) => {
              const isUrgent = lc.daysRemaining <= 15;
              return (
                <div
                  key={lc.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isUrgent
                      ? 'border-rose-200/80 bg-rose-50/50 hover:bg-rose-50'
                      : 'border-slate-200/70 bg-slate-50/60 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isUrgent ? (
                        <Flame className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {lc.lcNumber}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[140px] sm:max-w-[200px]">
                        Buyer: {lc.buyerName}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isUrgent
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {lc.daysRemaining <= 0
                        ? 'Expired'
                        : `${lc.daysRemaining} days left`}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Exp: {formatDate(lc.expiryDate)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
