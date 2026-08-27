'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PO } from '@/types/commercial';
import { PoDrawer } from '@/components/commercial/po-drawer';
import { formatDate, formatNumber } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import {
  ShoppingBag,
  Search,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  FileText,
  ArrowRight,
  Loader2,
  ChevronRight,
} from 'lucide-react';

export default function PoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [lcFilter, setLcFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PO | null>(null);

  // Fetch Buyers for filter dropdown
  const { data: buyersData } = useQuery({
    queryKey: ['buyers-po-filter'],
    queryFn: async () => {
      const res = await api.get('/buyers', { params: { per_page: 100 } });
      return res.data?.data;
    },
  });

  const buyers: any[] = Array.isArray(buyersData?.data)
    ? buyersData.data
    : Array.isArray(buyersData)
    ? buyersData
    : [];

  // Fetch PO List
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['pos', page, search, statusFilter, buyerFilter, lcFilter],
    queryFn: async () => {
      const res = await api.get('/po', {
        params: {
          page,
          per_page: 25,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          buyerId: buyerFilter || undefined,
          lcId: lcFilter === 'NO_LC' ? undefined : lcFilter || undefined,
        },
      });
      return res.data?.data;
    },
  });

  // Soft-Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/po/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
  });

  // Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/po/${id}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
  });

  const rawPos: PO[] = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
    ? data
    : [];

  // Client-side refinement for NO_LC or other specifics
  const pos = rawPos.filter((po) => {
    if (lcFilter === 'WITH_LC' && !po.lc) return false;
    if (lcFilter === 'NO_LC' && po.lc) return false;
    return true;
  });

  const totalPages = data?.total_page || 1;
  const totalCount = data?.total || pos.length;

  const hasActiveFilters = Boolean(search || statusFilter || buyerFilter || lcFilter);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setBuyerFilter('');
    setLcFilter('');
    setPage(1);
  };

  const handleOpenCreate = () => {
    setSelectedPo(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (po: PO) => {
    setSelectedPo(po);
    setIsDrawerOpen(true);
  };

  const handleSuccess = (createdId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['pos'] });
    if (createdId && !selectedPo) {
      router.push(`/commercial/po/${createdId}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'CONFIRMED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_PRODUCTION':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'READY_FOR_SHIPMENT':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'PARTIALLY_SHIPPED':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Purchase Orders (PO) Manager
            </h1>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {totalCount} Total Orders
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track customer purchase orders, line items fulfillment, and shipment delivery progress
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by PO number or buyer name..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Buyer Filter */}
        <select
          value={buyerFilter}
          onChange={(e) => {
            setBuyerFilter(e.target.value);
            setPage(1);
          }}
          className="w-full lg:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
        >
          <option value="">🏢 All Buyers</option>
          {buyers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>

        {/* LC Attachment Filter */}
        <select
          value={lcFilter}
          onChange={(e) => {
            setLcFilter(e.target.value);
            setPage(1);
          }}
          className="w-full lg:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
        >
          <option value="">📄 All LC Types</option>
          <option value="WITH_LC">Linked to LC</option>
          <option value="NO_LC">Direct / No LC</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-full lg:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="IN_PRODUCTION">IN PRODUCTION</option>
          <option value="READY_FOR_SHIPMENT">READY FOR SHIPMENT</option>
          <option value="PARTIALLY_SHIPPED">PARTIALLY SHIPPED</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

        {/* Reset Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="w-full lg:w-auto shrink-0 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Reset
          </button>
        )}

        {isFetching && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
          </div>
        )}
      </div>

      {/* PO Data Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-xs font-medium text-slate-500">Loading purchase orders...</p>
          </div>
        ) : pos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Purchase Orders</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {search || statusFilter ? 'No orders matched your filter.' : 'Create your first commercial purchase order.'}
            </p>
            {!search && !statusFilter && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create PO</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">PO Number</th>
                  <th className="px-5 py-3.5">Buyer & LC</th>
                  <th className="px-5 py-3.5">Dates</th>
                  <th className="px-5 py-3.5">Shipment Progress</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {pos.map((po) => {
                  const isCancelled = po.status === 'CANCELLED';

                  // Calculate total ordered and shipped from items
                  let ordered = 0;
                  let shipped = 0;
                  if (po.items && po.items.length > 0) {
                    po.items.forEach((i) => {
                      ordered += i.quantity || 0;
                      shipped += i.shippedQuantity || 0;
                    });
                  } else {
                    ordered = po.totalQuantity || 0;
                  }

                  const pct = ordered > 0 ? Math.min(100, Math.round((shipped / ordered) * 100)) : 0;

                  return (
                    <tr
                      key={po.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isCancelled ? 'bg-slate-50/40 opacity-70' : ''
                      }`}
                    >
                      {/* PO Number */}
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        <NextLink
                          href={`/commercial/po/${po.id}`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200/80 hover:bg-blue-100 transition"
                        >
                          <span>{po.poNumber}</span>
                          <ChevronRight className="h-3 w-3 text-blue-500" />
                        </NextLink>
                      </td>

                      {/* Buyer & LC */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {po.buyer?.name || 'Unknown Buyer'}
                        </div>
                        {po.lc ? (
                          <div className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold mt-0.5">
                            <FileText className="h-3 w-3" />
                            <span>{po.lc.lcNumber}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400">Direct Order (No LC)</div>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <div className="text-slate-600">
                            Ordered: {formatDate(po.orderDate)}
                          </div>
                          {po.deliveryDate && (
                            <div className="text-[11px] text-slate-400">
                              Delivery: {formatDate(po.deliveryDate)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Progress Bar */}
                      <td className="px-5 py-4 min-w-[200px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-800">
                              {formatNumber(shipped)} / {formatNumber(ordered)} pairs
                            </span>
                            <span className="font-bold text-blue-600">{pct}%</span>
                          </div>
                          {/* Progress Track */}
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
                            <div
                              className={`h-full transition-all duration-300 rounded-full ${
                                pct === 100
                                  ? 'bg-emerald-500'
                                  : pct > 0
                                  ? 'bg-blue-600'
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusBadge(
                            po.status,
                          )}`}
                        >
                          {po.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <NextLink
                            href={`/commercial/po/${po.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                          >
                            <span>Details</span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                          </NextLink>

                          {!isCancelled ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(po)}
                                title="Edit PO"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to cancel ${po.poNumber}?`)) {
                                    deleteMutation.mutate(po.id);
                                  }
                                }}
                                title="Cancel PO"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => restoreMutation.mutate(po.id)}
                              title="Restore PO"
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
      <PoDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={handleSuccess}
        poToEdit={selectedPo}
      />
    </div>
  );
}
