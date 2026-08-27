'use client';

import { RecentStockBatch } from '@/types/dashboard';
import { formatNumber } from '@/lib/utils';
import { Boxes, ArrowRight, MapPin, Package, Tag, ArrowUpRight } from 'lucide-react';
import NextLink from 'next/link';

interface RecentStocksFeedProps {
  stocks?: RecentStockBatch[];
  isLoading: boolean;
}

export function RecentStocksFeed({ stocks, isLoading }: RecentStocksFeedProps) {
  if (isLoading || !stocks) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-44 rounded-md bg-slate-100" />
          <div className="h-4 w-20 rounded-md bg-slate-100" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
      {/* Feed Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Boxes className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Recent In-Hand Stocks
            </h3>
            {stocks.length > 0 && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                Latest Batches
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Recently received inventory batches and stock allocations
          </p>
        </div>

        <NextLink
          href="/inventory/stock"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-2xs hover:bg-blue-50 hover:border-blue-200 transition cursor-pointer self-start sm:self-auto"
        >
          <span>See All Stocks</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </NextLink>
      </div>

      {/* Feed Content */}
      {stocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
            <Package className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-slate-800">No Recent Stock Batches</p>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
            Inward inventory receipts will automatically display here upon completion.
          </p>
          <NextLink
            href="/inventory/stock-in"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
          >
            <span>Execute Inward Stock Receipt</span>
            <ArrowRight className="h-3 w-3" />
          </NextLink>
        </div>
      ) : (
        <div className="space-y-3">
          {stocks.map((stock) => (
            <div
              key={stock.id}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all"
            >
              {/* Left Column: Product & Batch Identification */}
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs shrink-0 group-hover:border-emerald-300 group-hover:text-emerald-600 transition">
                  <Package className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {stock.batchId}
                    </span>
                    {stock.poNumber && (
                      <span className="inline-flex rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                        PO: {stock.poNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                    {stock.productName}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                      <Tag className="h-3 w-3 text-slate-400" />
                      {stock.material}
                    </span>
                    <span>•</span>
                    <span>Color: <strong className="text-slate-700">{stock.colorName}</strong></span>
                    <span>•</span>
                    <span>Gender: <strong className="text-slate-700">{stock.gender}</strong></span>
                  </div>
                </div>
              </div>

              {/* Right Column: Quantities, Location & Navigation */}
              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                <div className="text-left sm:text-right">
                  <div className="flex items-baseline gap-1 sm:justify-end">
                    <span className="text-sm font-bold text-emerald-700 font-mono">
                      {formatNumber(stock.availableQty)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      / {formatNumber(stock.totalQty)} pairs
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 sm:justify-end mt-0.5">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[150px] font-mono text-[10px]">
                      {stock.locationName}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>{stock.packetCount} pkts</span>
                  </div>
                </div>

                <NextLink
                  href="/inventory/stock"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition shrink-0"
                  title="View in Stock Explorer"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </NextLink>
              </div>
            </div>
          ))}

          {/* Bottom Card Footer Action Button */}
          <div className="pt-2">
            <NextLink
              href="/inventory/stock"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition cursor-pointer"
            >
              <span>Explore All Live In-Hand Stocks & Batches</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </NextLink>
          </div>
        </div>
      )}
    </div>
  );
}
