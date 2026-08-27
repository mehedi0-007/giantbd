'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { InventoryMovement, InventoryMovementType } from '@/types/inventory';
import { DataPagination } from '@/components/common/data-pagination';
import { formatDateTime, formatNumber } from '@/lib/utils';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Search,
  RotateCcw,
  AlertCircle,
  FileSpreadsheet,
  Loader2,
  Filter,
} from 'lucide-react';

export default function MovementsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch Movements Ledger
  const { data: movementsData, isLoading, isFetching } = useQuery({
    queryKey: ['inventory-movements', page, pageSize, search, typeFilter],
    queryFn: async () => {
      const res = await api.get('/inventory/movements', {
        params: {
          page,
          per_page: pageSize,
          type: typeFilter || undefined,
          search: search.trim() || undefined,
        },
      });
      return res.data?.data;
    },
  });

  const movements: InventoryMovement[] = Array.isArray(movementsData?.data)
    ? movementsData.data
    : Array.isArray(movementsData)
    ? movementsData
    : [];

  const totalCount = movementsData?.total || movements.length;
  const totalPages = movementsData?.total_page || 1;

  const getTypeBadge = (type: InventoryMovementType) => {
    switch (type) {
      case 'RECEIVED':
        return {
          icon: <ArrowDownLeft className="h-3 w-3 text-emerald-600" />,
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          prefix: '+',
          qtyColor: 'text-emerald-700 font-bold',
        };
      case 'SALE':
        return {
          icon: <ArrowUpRight className="h-3 w-3 text-blue-600" />,
          classes: 'bg-blue-50 text-blue-700 border-blue-200',
          prefix: '-',
          qtyColor: 'text-blue-700 font-bold',
        };
      case 'TRANSFER':
        return {
          icon: <ArrowLeftRight className="h-3 w-3 text-amber-600" />,
          classes: 'bg-amber-50 text-amber-700 border-amber-200',
          prefix: '±',
          qtyColor: 'text-amber-700 font-bold',
        };
      case 'RETURN':
        return {
          icon: <RotateCcw className="h-3 w-3 text-purple-600" />,
          classes: 'bg-purple-50 text-purple-700 border-purple-200',
          prefix: '+',
          qtyColor: 'text-purple-700 font-bold',
        };
      case 'DAMAGE':
        return {
          icon: <AlertCircle className="h-3 w-3 text-rose-600" />,
          classes: 'bg-rose-50 text-rose-700 border-rose-200',
          prefix: '-',
          qtyColor: 'text-rose-700 font-bold',
        };
      case 'ADJUSTMENT':
        return {
          icon: <ArrowLeftRight className="h-3 w-3 text-indigo-600" />,
          classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          prefix: '±',
          qtyColor: 'text-indigo-700 font-bold',
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Inventory Movements Ledger
            </h1>
            <span className="rounded-md bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
              Double-Entry Audit Log
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Immutable transaction history tracking every receipt, dispatch, transfer, and adjustment across the warehouse
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by SKU, note, or reference ID..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="">All Movement Types</option>
            <option value="RECEIVED">RECEIVED (+ Inward)</option>
            <option value="SALE">SALE (- Dispatched)</option>
            <option value="TRANSFER">TRANSFER (Inter-location)</option>
            <option value="RETURN">RETURN (+ Customer Return)</option>
            <option value="DAMAGE">DAMAGE (- Scrap)</option>
            <option value="ADJUSTMENT">ADJUSTMENT (Audit)</option>
          </select>

          {isFetching && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>

      {/* Movements Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-xs font-medium text-slate-500">Loading immutable movement ledger...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileSpreadsheet className="h-10 w-10 text-slate-300 mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No stock movements recorded</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              All inward goods receipts and stock-out dispatches will automatically produce audit entries here.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Timestamp</th>
                    <th className="px-5 py-3.5">Movement Type</th>
                    <th className="px-5 py-3.5">SKU & Item</th>
                    <th className="px-5 py-3.5 text-right">Quantity</th>
                    <th className="px-5 py-3.5">Storage Location</th>
                    <th className="px-5 py-3.5">Reference / Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {movements.map((m) => {
                    const badge = getTypeBadge(m.type);
                    const p = m.inventoryBatchItem?.product;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Timestamp */}
                        <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                          {formatDateTime(m.createdAt)}
                        </td>

                        {/* Movement Type */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.classes}`}
                          >
                            {badge.icon}
                            <span>{m.type}</span>
                          </span>
                        </td>

                        {/* SKU & Item */}
                        <td className="px-5 py-3.5">
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            {p?.sku || 'SKU'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {p?.name || 'Variant Product'} &bull; Size {p?.size}
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="px-5 py-3.5 text-right">
                          <span className={`text-sm ${badge.qtyColor}`}>
                            {badge.prefix}
                            {formatNumber(m.quantity)} pairs
                          </span>
                        </td>

                        {/* Storage Location */}
                        <td className="px-5 py-3.5">
                          <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {m.inventoryBatchItem?.location?.code || 'WH Location'}
                          </span>
                        </td>

                        {/* Reference / Note */}
                        <td className="px-5 py-3.5">
                          <div className="text-slate-700 text-xs truncate max-w-xs">
                            {m.note || m.referenceId || 'System Auto-Allocated'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Unified Pagination Toolbar */}
            <DataPagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(s) => setPageSize(s)}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </>
        )}
      </div>
    </div>
  );
}
