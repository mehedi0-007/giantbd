'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Buyer } from '@/types/commercial';
import { BuyerDrawer } from '@/components/commercial/buyer-drawer';
import { ConfirmDialog, TableSkeleton, EmptyState } from '@/components/common';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Globe,
  Mail,
  Phone,
  FileText,
  ShoppingBag,
  Loader2,
} from 'lucide-react';

export default function BuyersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [buyerToDelete, setBuyerToDelete] = useState<Buyer | null>(null);

  // Fetch Buyers List
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['buyers', page, search],
    queryFn: async () => {
      const res = await api.get('/buyers', {
        params: { page, per_page: 15, search: search.trim() || undefined },
      });
      return res.data?.data;
    },
  });

  // Soft-Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/buyers/${id}`);
    },
    onSuccess: () => {
      toast.success('Buyer deactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      setBuyerToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to deactivate buyer');
    },
  });

  // Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/buyers/${id}/restore`);
    },
    onSuccess: () => {
      toast.success('Buyer restored successfully');
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to restore buyer');
    },
  });

  const buyers: Buyer[] = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
    ? data
    : [];

  const totalPages = data?.total_page || 1;
  const totalCount = data?.total || buyers.length;

  const handleOpenCreate = () => {
    setSelectedBuyer(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (buyer: Buyer) => {
    setSelectedBuyer(buyer);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Commercial Buyers Directory
            </h1>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {totalCount} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage global buyers, export clients, and linked commercial contracts
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Buyer</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by buyer name, code, or country..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {isFetching && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
            <span>Updating...</span>
          </div>
        )}
      </div>

      {/* Buyers Data Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {isLoading ? (
          <TableSkeleton
            rows={6}
            columns={['26%', '22%', '16%', '16%', '10%', '10%']}
          />
        ) : buyers.length === 0 ? (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title={search ? 'No matching buyers found' : 'No buyers registered yet'}
            description={
              search
                ? `No buyers found matching "${search}". Try searching with a different term.`
                : 'Start by adding your first international or domestic commercial buyer.'
            }
            action={
              search
                ? {
                    label: 'Clear Search',
                    onClick: () => setSearch(''),
                    variant: 'secondary',
                  }
                : {
                    label: 'Add Buyer',
                    onClick: handleOpenCreate,
                    icon: <Plus className="h-3.5 w-3.5" />,
                  }
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Buyer Code & Name</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Country</th>
                  <th className="px-5 py-3.5">Linked Contracts</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {buyers.map((b) => {
                  const isDeleted = b.status === 'DELETED';
                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isDeleted ? 'bg-slate-50/40 opacity-70' : ''
                      }`}
                    >
                      {/* Code & Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 border border-slate-200/80">
                            {b.code}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {b.name}
                            </div>
                            {b.contactPerson && (
                              <div className="text-[11px] text-slate-400">
                                Contact: {b.contactPerson}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          {b.email ? (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span>{b.email}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                          {b.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span>{b.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Country */}
                      <td className="px-5 py-4">
                        {b.country ? (
                          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                            <Globe className="h-3.5 w-3.5 text-slate-400" />
                            <span>{b.country}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Linked Contracts Count */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-slate-600" title="Letters of Credit">
                            <FileText className="h-3.5 w-3.5 text-amber-500" />
                            <span>{b._count?.lcs || b.lcs?.length || 0} LCs</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-600" title="Purchase Orders">
                            <ShoppingBag className="h-3.5 w-3.5 text-blue-500" />
                            <span>{b._count?.purchaseOrders || b.purchaseOrders?.length || 0} POs</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isDeleted
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isDeleted ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(b)}
                                title="Edit Buyer"
                                aria-label={`Edit buyer ${b.name}`}
                                className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setBuyerToDelete(b)}
                                title="Deactivate Buyer"
                                aria-label={`Deactivate buyer ${b.name}`}
                                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => restoreMutation.mutate(b.id)}
                              title="Restore Buyer"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition cursor-pointer min-h-[36px]"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
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
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer min-h-[36px]"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer min-h-[36px]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Create/Edit Drawer */}
      <BuyerDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={() => {
          toast.success(selectedBuyer ? 'Buyer updated successfully' : 'Buyer created successfully');
          queryClient.invalidateQueries({ queryKey: ['buyers'] });
        }}
        buyerToEdit={selectedBuyer}
      />

      {/* Accessible Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(buyerToDelete)}
        onClose={() => setBuyerToDelete(null)}
        onConfirm={async () => {
          if (buyerToDelete) {
            await deleteMutation.mutateAsync(buyerToDelete.id);
          }
        }}
        title="Deactivate Buyer"
        description={
          <>
            Are you sure you want to deactivate <strong className="text-slate-900">{buyerToDelete?.name}</strong> ({buyerToDelete?.code})?
            This will mark their profile as inactive in commercial orders.
          </>
        }
        confirmText="Deactivate Buyer"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
