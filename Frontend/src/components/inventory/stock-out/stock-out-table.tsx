'use client';

import React from 'react';
import { StockOut, StockOutStatus } from '@/types/inventory';
import { DataPagination, TableSkeleton, EmptyState } from '@/components/common';
import { formatDate } from '@/lib/utils';
import {
  Truck,
  Plus,
  Search,
  Printer,
  CheckCircle2,
  Ban,
  Loader2,
} from 'lucide-react';

interface StockOutTableProps {
  challans: StockOut[];
  isLoading: boolean;
  isFetching: boolean;
  buyers: Array<{ id: string; name: string; code: string }>;
  search: string;
  onSearchChange: (val: string) => void;
  buyerFilter: string;
  onBuyerFilterChange: (val: string) => void;
  typeFilter: string;
  onTypeFilterChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onResetFilters: () => void;
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onOpenCreate: () => void;
  onPrintChallan: (c: StockOut) => void;
  onOpenDelivered: (c: StockOut) => void;
  onOpenPaymentSettle: (c: StockOut) => void;
  onOpenCancel: (c: StockOut) => void;
}

export function StockOutTable({
  challans,
  isLoading,
  isFetching,
  buyers,
  search,
  onSearchChange,
  buyerFilter,
  onBuyerFilterChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  onResetFilters,
  page,
  pageSize,
  totalPages,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onOpenCreate,
  onPrintChallan,
  onOpenDelivered,
  onOpenPaymentSettle,
  onOpenCancel,
}: StockOutTableProps) {
  const getStatusBadge = (status: StockOutStatus) => {
    switch (status) {
      case 'ISSUED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PAYMENT_RECEIVED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const hasActiveFilters = Boolean(search || buyerFilter || typeFilter || statusFilter);

  return (
    <div className="space-y-4">
      {/* Search & Multi-Filters Bar */}
      <div className="flex flex-col lg:flex-row items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by challan #, PO number, or buyer..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden min-h-[40px]"
          />
        </div>

        {/* Buyer Filter */}
        <select
          value={buyerFilter}
          onChange={(e) => onBuyerFilterChange(e.target.value)}
          className="w-full lg:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden min-h-[40px]"
        >
          <option value="">🏢 All Buyers</option>
          {buyers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>

        {/* Shipment Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          className="w-full lg:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden min-h-[40px]"
        >
          <option value="">📦 All Dispatch Types</option>
          <option value="PO_SHIPMENT">PO Shipment</option>
          <option value="DIRECT_SALE">Direct Commercial Sale</option>
          <option value="SAMPLE_DISPATCH">Sample Dispatch</option>
          <option value="DAMAGE_SCRAP">Damage / Scrap</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="w-full lg:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden min-h-[40px]"
        >
          <option value="">All Statuses</option>
          <option value="ISSUED">ISSUED</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="PAYMENT_RECEIVED">PAYMENT RECEIVED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="w-full lg:w-auto shrink-0 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer min-h-[40px]"
          >
            Reset
          </button>
        )}

        {isFetching && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 pr-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
          </div>
        )}
      </div>

      {/* Challans Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {isLoading ? (
          <TableSkeleton
            rows={6}
            columns={['22%', '24%', '16%', '16%', '12%', '10%']}
          />
        ) : challans.length === 0 ? (
          <EmptyState
            icon={<Truck className="h-7 w-7 text-blue-600" />}
            title={hasActiveFilters ? 'No matching challans found' : 'No delivery challans yet'}
            description={
              hasActiveFilters
                ? 'No delivery challans match your active filter criteria.'
                : 'Create a new stock-out delivery challan to dispatch goods against purchase orders or commercial sales.'
            }
            action={
              hasActiveFilters
                ? {
                    label: 'Reset Filters',
                    onClick: onResetFilters,
                    variant: 'secondary',
                  }
                : {
                    label: 'Dispatch New Shipment',
                    onClick: onOpenCreate,
                    icon: <Plus className="h-3.5 w-3.5" />,
                  }
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Challan Number</th>
                    <th className="px-5 py-3.5">PO / Buyer Contract</th>
                    <th className="px-5 py-3.5">Dispatch Date</th>
                    <th className="px-5 py-3.5">Destination Port</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {challans.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {c.challanNumber}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Sequence #{c.partialSequence || 1} • {c.type}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {c.po ? (
                          <div>
                            <div className="font-mono font-semibold text-blue-600">
                              {c.po.poNumber}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {c.buyer?.name || 'Buyer'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Direct Dispatch</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(c.dispatchDate)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {c.destination || 'Standard Factory Delivery'}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusBadge(
                            c.status,
                          )}`}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onPrintChallan(c)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition cursor-pointer min-h-[36px]"
                            title="Print Official Challan"
                            aria-label={`Print challan ${c.challanNumber}`}
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Print</span>
                          </button>

                          {c.status === 'ISSUED' && (
                            <>
                              <button
                                type="button"
                                onClick={() => onOpenDelivered(c)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer shadow-2xs min-h-[36px]"
                                title="Mark as Delivered"
                                aria-label={`Mark challan ${c.challanNumber} as delivered`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Delivered</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenCancel(c)}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer min-h-[36px]"
                                title="Cancel Challan & Restore Stock"
                                aria-label={`Cancel challan ${c.challanNumber}`}
                              >
                                <Ban className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Cancel</span>
                              </button>
                            </>
                          )}

                          {c.status === 'DELIVERED' && (
                            <button
                              type="button"
                              onClick={() => onOpenPaymentSettle(c)}
                              className="inline-flex items-center gap-1 rounded-lg bg-purple-50 border border-purple-200 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 transition cursor-pointer shadow-2xs min-h-[36px]"
                              title="Confirm Commercial Settlement"
                              aria-label={`Confirm payment for challan ${c.challanNumber}`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Paid</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Unified Pagination Toolbar */}
            <DataPagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </>
        )}
      </div>
    </div>
  );
}
