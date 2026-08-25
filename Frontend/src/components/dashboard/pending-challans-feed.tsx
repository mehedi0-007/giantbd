'use client';

import { PendingChallan } from '@/types/dashboard';
import { formatDate } from '@/lib/utils';
import { Truck, ArrowRight, CheckCircle2 } from 'lucide-react';
import NextLink from 'next/link';

interface PendingChallansFeedProps {
  challans?: PendingChallan[];
  isLoading: boolean;
}

export function PendingChallansFeed({
  challans,
  isLoading,
}: PendingChallansFeedProps) {
  if (isLoading || !challans) {
    return (
      <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs animate-pulse">
        <div className="h-5 w-48 rounded-md bg-slate-100 mb-2" />
        <div className="h-3 w-60 rounded-md bg-slate-100 mb-6" />
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
              In-Transit Challans
            </h3>
            {challans.length > 0 && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                {challans.length} Pending Delivery
              </span>
            )}
          </div>
          <NextLink
            href="/inventory/stock-out"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>All Challans</span>
            <ArrowRight className="h-3 w-3" />
          </NextLink>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Dispatched orders awaiting delivery confirmation & receipt document
        </p>

        {challans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-2">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-800">
              All Dispatches Completed
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              No stock-out challans are currently waiting for delivery receipts.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {challans.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200/70 bg-slate-50/60 hover:bg-slate-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {ch.challanNumber}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[140px] sm:max-w-[200px]">
                      Dest: {ch.destination || ch.buyerName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-slate-700">
                      {ch.itemsCount} {ch.itemsCount === 1 ? 'item' : 'items'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatDate(ch.dispatchDate)}
                    </div>
                  </div>
                  <NextLink
                    href={`/inventory/stock-out`}
                    className="inline-flex items-center justify-center rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition shadow-2xs"
                  >
                    Confirm
                  </NextLink>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
