'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PO } from '@/types/commercial';
import { formatDate, formatNumber } from '@/lib/utils';
import NextLink from 'next/link';
import {
  ShoppingBag,
  ArrowLeft,
  Plus,
  FileText,
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Package,
  Layers,
} from 'lucide-react';

export default function PoDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [itemQuantity, setItemQuantity] = useState<number>(100);
  const [addErrorMsg, setAddErrorMsg] = useState('');

  // Fetch PO Detail
  const { data: poData, isLoading } = useQuery({
    queryKey: ['po-detail', id],
    queryFn: async () => {
      const res = await api.get(`/po/${id}`);
      return res.data?.data;
    },
    enabled: !!id,
  });

  // Fetch Variants for Item Picker
  const { data: variantsData } = useQuery({
    queryKey: ['variants-picker'],
    queryFn: async () => {
      const res = await api.get('/variants', { params: { per_page: 200 } });
      return res.data?.data;
    },
    enabled: isAddItemsModalOpen,
  });

  const variants = Array.isArray(variantsData?.data)
    ? variantsData.data
    : Array.isArray(variantsData)
    ? variantsData
    : [];

  // Add Items Mutation
  const addItemsMutation = useMutation({
    mutationFn: async (payload: { items: Array<{ variantProductId: string; quantity: number }> }) => {
      await api.post(`/po/${id}/items`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      setIsAddItemsModalOpen(false);
      setSelectedVariantId('');
      setItemQuantity(100);
      setAddErrorMsg('');
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : 'Failed to add items to Purchase Order.');
      setAddErrorMsg(msg);
    },
  });

  const po: PO | undefined = poData;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
        <p className="text-xs font-medium text-slate-500">Loading order details...</p>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500 mb-2" />
        <h3 className="text-base font-bold text-slate-900">Purchase Order Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          The requested purchase order could not be loaded or was removed.
        </p>
        <NextLink
          href="/commercial/po"
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs"
        >
          Back to Orders
        </NextLink>
      </div>
    );
  }

  // Compute Total Metrics
  let totalOrdered = 0;
  let totalShipped = 0;

  if (po.items && po.items.length > 0) {
    po.items.forEach((i) => {
      totalOrdered += i.quantity || 0;
      totalShipped += i.shippedQuantity || 0;
    });
  } else {
    totalOrdered = po.totalQuantity || 0;
  }

  const remaining = Math.max(0, totalOrdered - totalShipped);
  const fulfillmentPct =
    totalOrdered > 0 ? Math.min(100, Math.round((totalShipped / totalOrdered) * 100)) : 0;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantId || itemQuantity <= 0) {
      setAddErrorMsg('Please select a variant SKU and enter a valid quantity.');
      return;
    }

    addItemsMutation.mutate({
      items: [{ variantProductId: selectedVariantId, quantity: Number(itemQuantity) }],
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/commercial/po')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold tracking-tight text-slate-900">
                {po.poNumber}
              </span>
              <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200/80">
                {po.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Buyer: <strong className="text-slate-700">{po.buyer?.name}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddItemsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Line Items</span>
        </button>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Total Ordered</span>
            <Package className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {formatNumber(totalOrdered)} <span className="text-sm font-normal text-slate-500">pairs</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Dispatched</span>
            <Truck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-700">
            {formatNumber(totalShipped)} <span className="text-sm font-normal text-slate-500">pairs</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Remaining to Ship</span>
            <Layers className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-700">
            {formatNumber(remaining)} <span className="text-sm font-normal text-slate-500">pairs</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Fulfillment Rate</span>
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-purple-700">
            {fulfillmentPct}%
          </div>
        </div>
      </div>

      {/* Commercial Details Header Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
          Contract Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <span className="text-slate-400 font-medium">Buyer Code:</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">{po.buyer?.code || 'N/A'}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <span className="text-slate-400 font-medium">Letter of Credit (LC):</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">
              {po.lc ? (
                <span className="text-amber-700 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {po.lc.lcNumber}
                </span>
              ) : (
                <span className="text-slate-400">None (Direct Order)</span>
              )}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <span className="text-slate-400 font-medium">Order Remarks:</span>
            <p className="font-medium text-slate-700 text-xs mt-0.5 truncate">
              {po.remarks || 'No special remarks'}
            </p>
          </div>
        </div>
      </div>

      {/* PO Line Items Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Ordered Variant Line Items
            </h3>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {po.items?.length || 0} SKUs
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsAddItemsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Item</span>
          </button>
        </div>

        {!po.items || po.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-10 w-10 text-slate-300 mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No line items on this order</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Add catalog product variants to track production requirements and shipment delivery.
            </p>
            <button
              type="button"
              onClick={() => setIsAddItemsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add First Line Item</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">SKU & Product Name</th>
                  <th className="px-6 py-3.5">Color & Size</th>
                  <th className="px-6 py-3.5 text-right">Ordered Qty</th>
                  <th className="px-6 py-3.5 text-right">Shipped Qty</th>
                  <th className="px-6 py-3.5 text-right">Remaining</th>
                  <th className="px-6 py-3.5">Fulfillment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {po.items.map((item) => {
                  const rem = Math.max(0, item.quantity - item.shippedQuantity);
                  const itemPct =
                    item.quantity > 0
                      ? Math.min(100, Math.round((item.shippedQuantity / item.quantity) * 100))
                      : 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* SKU & Name */}
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {item.variantProduct?.sku || 'SKU-UNKNOWN'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.variantProduct?.masterProduct?.name || item.variantProduct?.name}
                        </div>
                      </td>

                      {/* Color & Size */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">
                            Size {item.variantProduct?.size || 'N/A'}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600">
                            {item.variantProduct?.color?.name || 'Color N/A'}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">
                            {item.variantProduct?.gender}
                          </span>
                        </div>
                      </td>

                      {/* Ordered Qty */}
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        {formatNumber(item.quantity)} prs
                      </td>

                      {/* Shipped Qty */}
                      <td className="px-6 py-4 text-right font-bold text-emerald-700">
                        {formatNumber(item.shippedQuantity)} prs
                      </td>

                      {/* Remaining Qty */}
                      <td className="px-6 py-4 text-right font-bold text-amber-700">
                        {formatNumber(rem)} prs
                      </td>

                      {/* Fulfillment Progress */}
                      <td className="px-6 py-4 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
                            <div
                              className={`h-full rounded-full transition-all ${
                                itemPct === 100
                                  ? 'bg-emerald-500'
                                  : itemPct > 0
                                  ? 'bg-blue-600'
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${itemPct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-700 w-8 text-right">
                            {itemPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Line Items Modal */}
      {isAddItemsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsAddItemsModalOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Plus className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Add Variant to {po.poNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddItemsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {addErrorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{addErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Select Product Variant SKU <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="" disabled>
                    Choose a variant SKU
                  </option>
                  {variants.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.sku} — {v.name} (Size {v.size}, {v.color?.name || 'Color'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Order Quantity (Pairs) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(Number(e.target.value))}
                  placeholder="e.g. 500"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemsModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addItemsMutation.isPending || !selectedVariantId || itemQuantity <= 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {addItemsMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add Item</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
