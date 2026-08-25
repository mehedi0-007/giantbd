'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { LC } from '@/types/commercial';
import { LcDrawer } from '@/components/commercial/lc-drawer';
import { formatDate } from '@/lib/utils';
import {
  FileText,
  Search,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Flame,
  AlertTriangle,
  Loader2,
  ShoppingBag,
} from 'lucide-react';

export default function LcPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedLc, setSelectedLc] = useState<LC | null>(null);

  // Fetch LC List
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['lcs', page, search, statusFilter],
    queryFn: async () => {
      const res = await api.get('/lcs', {
        params: {
          page,
          per_page: 15,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
        },
      });
      return res.data?.data;
    },
  });

  // Soft-Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/lcs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lcs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
  });

  // Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/lcs/${id}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lcs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
  });

  const lcs: LC[] = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
    ? data
    : [];

  const totalPages = data?.total_page || 1;
  const totalCount = data?.total || lcs.length;

  const handleOpenCreate = () => {
    setSelectedLc(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (lc: LC) => {
    setSelectedLc(lc);
    setIsDrawerOpen(true);
  };

  // Helper for Status Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'FULFILLED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'EXPIRED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Helper for Countdown Badge
  const getExpiryCountdown = (expiryDate?: string | null, status?: string) => {
    if (status === 'FULFILLED' || status === 'CANCELLED') return null;
    if (!expiryDate) return <span className="text-slate-400">—</span>;

    const diffDays = Math.ceil(
      (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays <= 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
          <Flame className="h-3 w-3 text-rose-600" />
          EXPIRED
        </span>
      );
    }
    if (diffDays <= 15) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs animate-pulse">
          <Flame className="h-3 w-3" />
          {diffDays} days left
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
          <AlertTriangle className="h-3 w-3 text-amber-600" />
          {diffDays} days left
        </span>
      );
    }
    return (
      <span className="text-slate-600 font-medium text-xs">
        {diffDays} days left
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Letters of Credit (LC) Tracker
            </h1>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {totalCount} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitor commercial bank instruments, shipment deadlines, and expiry countdowns
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Open New LC</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
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
            placeholder="Search by LC number or remarks..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="FULFILLED">FULFILLED</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          {isFetching && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>

      {/* LC Data Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-xs font-medium text-slate-500">Loading LC registry...</p>
          </div>
        ) : lcs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Letters of Credit</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {search || statusFilter ? 'No LCs matched your filter criteria.' : 'Create your first commercial Letter of Credit.'}
            </p>
            {!search && !statusFilter && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Open LC</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">LC Number</th>
                  <th className="px-5 py-3.5">Buyer</th>
                  <th className="px-5 py-3.5">Issue Date</th>
                  <th className="px-5 py-3.5">Shipment Date</th>
                  <th className="px-5 py-3.5">Expiry & Countdown</th>
                  <th className="px-5 py-3.5">Linked POs</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {lcs.map((lc) => {
                  const isCancelled = lc.status === 'CANCELLED';
                  return (
                    <tr
                      key={lc.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isCancelled ? 'bg-slate-50/40 opacity-70' : ''
                      }`}
                    >
                      {/* LC Number */}
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        <span className="inline-flex rounded-md bg-amber-50/80 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200/80">
                          {lc.lcNumber}
                        </span>
                      </td>

                      {/* Buyer */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {lc.buyer?.name || 'Unknown Buyer'}
                        </div>
                        {lc.buyer?.code && (
                          <div className="text-[11px] text-slate-400">
                            Code: {lc.buyer.code}
                          </div>
                        )}
                      </td>

                      {/* Issue Date */}
                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(lc.issueDate)}
                      </td>

                      {/* Latest Shipment Date */}
                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(lc.shipmentDate)}
                      </td>

                      {/* Expiry & Live Countdown */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-900">
                            {formatDate(lc.expiryDate)}
                          </div>
                          <div>{getExpiryCountdown(lc.expiryDate, lc.status)}</div>
                        </div>
                      </td>

                      {/* Linked POs */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-slate-700 font-semibold">
                          <ShoppingBag className="h-3.5 w-3.5 text-blue-500" />
                          <span>{lc._count?.purchaseOrders || lc.purchaseOrders?.length || 0} POs</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusBadge(
                            lc.status,
                          )}`}
                        >
                          {lc.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isCancelled ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(lc)}
                                title="Edit LC"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${lc.lcNumber}?`)) {
                                    deleteMutation.mutate(lc.id);
                                  }
                                }}
                                title="Delete LC"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => restoreMutation.mutate(lc.id)}
                              title="Restore LC"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Restore</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs">
            <span className="text-slate-500">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Create/Edit Drawer */}
      <LcDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['lcs'] })}
        lcToEdit={selectedLc}
      />
    </div>
  );
}
