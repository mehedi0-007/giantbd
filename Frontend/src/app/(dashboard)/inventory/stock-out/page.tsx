'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { StockOut, StockOutType, StockOutStatus } from '@/types/inventory';
import { PO } from '@/types/commercial';
import { ChallanPdfModal } from '@/components/inventory/challan-pdf-modal';
import { formatDate, formatNumber } from '@/lib/utils';
import {
  Truck,
  Plus,
  Search,
  FileText,
  Printer,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Ban,
  Package,
} from 'lucide-react';

export default function StockOutPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'registry' | 'create'>('registry');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Print Challan Modal State
  const [selectedChallanForPrint, setSelectedChallanForPrint] = useState<StockOut | null>(null);

  // Mark Delivered Modal State (with receipt upload)
  const [deliveringChallan, setDeliveringChallan] = useState<StockOut | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Form States for Create Challan
  const [dispatchMode, setDispatchMode] = useState<'PO_SHIPMENT' | 'DIRECT_SALE' | 'SAMPLE_DISPATCH' | 'DAMAGE_SCRAP'>('PO_SHIPMENT');
  const [selectedPoId, setSelectedPoId] = useState('');
  const [destination, setDestination] = useState('');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // 1. Fetch Challans List
  const { data: challansData, isLoading, isFetching } = useQuery({
    queryKey: ['stock-outs', page, search, statusFilter],
    queryFn: async () => {
      const res = await api.get('/inventory/stock-out', {
        params: {
          page,
          per_page: 20,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
        },
      });
      return res.data?.data;
    },
  });

  // 2. Fetch Active Purchase Orders for Dispatch
  const { data: posData } = useQuery({
    queryKey: ['pos-for-dispatch'],
    queryFn: async () => {
      const res = await api.get('/po', { params: { per_page: 100 } });
      return res.data?.data;
    },
    enabled: activeTab === 'create',
  });

  // 3. Fetch PO Preview Allocation if PO is selected
  const { data: poPreviewData, isLoading: loadingPoPreview } = useQuery({
    queryKey: ['po-dispatch-preview', selectedPoId],
    queryFn: async () => {
      const res = await api.get(`/inventory/stock-out/preview-po/${selectedPoId}`);
      return res.data?.data;
    },
    enabled: !!selectedPoId && dispatchMode === 'PO_SHIPMENT',
  });

  const challans: StockOut[] = Array.isArray(challansData?.data)
    ? challansData.data
    : Array.isArray(challansData)
    ? challansData
    : [];

  const pos: PO[] = Array.isArray(posData?.data) ? posData.data : Array.isArray(posData) ? posData : [];

  // Update Status Mutation
  const handleUpdateStatus = async (id: string, newStatus: StockOutStatus, doc?: File) => {
    setIsUpdatingStatus(true);
    try {
      if (doc) {
        const formData = new FormData();
        formData.append('status', newStatus);
        formData.append('document', doc);
        await api.patch(`/inventory/stock-out/${id}/status`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.patch(`/inventory/stock-out/${id}/status`, { status: newStatus });
      }

      queryClient.invalidateQueries({ queryKey: ['stock-outs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      setDeliveringChallan(null);
      setReceiptFile(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update challan status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Cancel Challan Mutation
  const handleCancelChallan = async (id: string, challanNumber: string) => {
    if (!confirm(`Are you sure you want to CANCEL challan ${challanNumber}? Allocated inventory will be safely restored to available stock.`)) {
      return;
    }

    try {
      await api.post(`/inventory/stock-out/${id}/cancel`, { note: 'Cancelled via dashboard' });
      queryClient.invalidateQueries({ queryKey: ['stock-outs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel challan.');
    }
  };

  // Create Challan Submit
  const handleCreateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dispatchMode === 'PO_SHIPMENT' && !selectedPoId) {
      setFormError('Please select a Purchase Order.');
      return;
    }

    setIsCreating(true);
    setFormError('');

    try {
      // Build FIFO allocations from previewed available stock
      const itemsToDispatch: { batchItemId: string; issueQty: number }[] = [];

      if (poPreviewData?.items) {
        for (const item of poPreviewData.items) {
          let needed = item.remainingQty || item.reqQty || 0;
          for (const stock of item.availableWarehouseStock || []) {
            if (needed <= 0) break;
            const take = Math.min(stock.inHand, needed);
            if (take > 0) {
              itemsToDispatch.push({ batchItemId: stock.batchItemId, issueQty: take });
              needed -= take;
            }
          }
        }
      }

      if (itemsToDispatch.length === 0) {
        setFormError('No available warehouse batch stock found to fulfill this shipment.');
        setIsCreating(false);
        return;
      }

      const payload = {
        type: dispatchMode,
        poId: dispatchMode === 'PO_SHIPMENT' ? selectedPoId : undefined,
        destination,
        dispatchDate: new Date(dispatchDate).toISOString(),
        note,
        items: itemsToDispatch,
      };

      const res = await api.post('/inventory/stock-out', payload);
      const createdChallan = res.data?.data?.challan || res.data?.data;

      queryClient.invalidateQueries({ queryKey: ['stock-outs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });

      // Open print modal immediately
      setSelectedChallanForPrint(createdChallan);
      setActiveTab('registry');
      setSelectedPoId('');
      setDestination('');
      setNote('');
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : 'Failed to create Stock-Out challan.');
      setFormError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusBadge = (status: StockOutStatus) => {
    switch (status) {
      case 'ISSUED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DELIVERED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'PAYMENT_RECEIVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Stock-Out & Delivery Challans
            </h1>
            <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              Outward Dispatch Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch shipments, execute FIFO stock allocations, track delivery status, and print official challans
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'registry' ? 'create' : 'registry')}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer"
          >
            {activeTab === 'registry' ? (
              <>
                <Plus className="h-4 w-4" />
                <span>New Delivery Challan</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <span>View Challan Registry</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2 Tabs Navigator */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('registry')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer ${
            activeTab === 'registry'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Challan Registry ({challans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer ${
            activeTab === 'create'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Dispatch New Shipment</span>
        </button>
      </div>

      {/* TAB 1: CHALLAN REGISTRY */}
      {activeTab === 'registry' && (
        <div className="space-y-4">
          {/* Search & Status Filter */}
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
                placeholder="Search by challan #, PO number, or buyer..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">All Statuses</option>
                <option value="ISSUED">ISSUED</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="PAYMENT_RECEIVED">PAYMENT RECEIVED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>

              {isFetching && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                </div>
              )}
            </div>
          </div>

          {/* Challans Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                <p className="text-xs font-medium text-slate-500">Loading delivery challans...</p>
              </div>
            ) : challans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Truck className="h-10 w-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No delivery challans found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Create a new stock-out delivery challan to dispatch goods against purchase orders or sales.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Challan</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Challan # & Date</th>
                      <th className="px-5 py-3.5">Buyer & PO Contract</th>
                      <th className="px-5 py-3.5">Dispatched Volume</th>
                      <th className="px-5 py-3.5">Lifecycle Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {challans.map((c) => {
                      const totalQty =
                        c.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) ||
                        c.totalQuantity ||
                        0;

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Challan # & Date */}
                          <td className="px-5 py-4">
                            <div className="font-mono font-bold text-slate-900 text-xs">
                              {c.challanNumber}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {formatDate(c.dispatchDate)}
                            </div>
                          </td>

                          {/* Buyer & PO */}
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-800">
                              {c.buyer?.name || c.po?.buyer?.name || 'Direct Dispatch'}
                            </div>
                            {c.po && (
                              <div className="font-mono text-[11px] text-blue-600">
                                PO: {c.po.poNumber}
                              </div>
                            )}
                          </td>

                          {/* Dispatched Volume */}
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-900 text-sm">
                              {formatNumber(totalQty)} <span className="text-xs font-normal text-slate-500">pairs</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {c.items?.length || 0} variant line items
                            </div>
                          </td>

                          {/* Lifecycle Status */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getStatusBadge(
                                c.status,
                              )}`}
                            >
                              {c.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Print Button */}
                              <button
                                type="button"
                                onClick={() => setSelectedChallanForPrint(c)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                title="Print Official PDF Challan"
                              >
                                <Printer className="h-3.5 w-3.5 text-blue-600" />
                                <span>Challan</span>
                              </button>

                              {/* State Workflow Triggers */}
                              {c.status === 'ISSUED' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setDeliveringChallan(c)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 text-[11px] font-bold hover:bg-purple-100 transition cursor-pointer"
                                  >
                                    <Truck className="h-3 w-3" />
                                    <span>Deliver</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCancelChallan(c.id, c.challanNumber)}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                    title="Cancel & Rollback Stock"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}

                              {c.status === 'DELIVERED' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(c.id, 'PAYMENT_RECEIVED')}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-[11px] font-bold hover:bg-emerald-100 transition cursor-pointer"
                                >
                                  <ShieldCheck className="h-3 w-3" />
                                  <span>Paid</span>
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
          </div>
        </div>
      )}

      {/* TAB 2: CREATE CHALLAN FORM */}
      {activeTab === 'create' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              Create Stock-Out Delivery Challan
            </h3>
            <p className="text-xs text-slate-500">
              Allocate and deduct inventory using First-In-First-Out (FIFO) batch principles
            </p>
          </div>

          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateChallan} className="space-y-5">
            {/* Dispatch Mode Selector */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Dispatch Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'PO_SHIPMENT', label: 'PO Shipment' },
                  { value: 'DIRECT_SALE', label: 'Direct Sale' },
                  { value: 'SAMPLE_DISPATCH', label: 'Sample Dispatch' },
                  { value: 'DAMAGE_SCRAP', label: 'Damage / Scrap' },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setDispatchMode(mode.value as any)}
                    className={`rounded-xl py-2 px-3 text-xs font-bold border transition cursor-pointer text-center ${
                      dispatchMode === mode.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PO Selector (for PO_SHIPMENT) */}
            {dispatchMode === 'PO_SHIPMENT' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Target Purchase Order <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedPoId}
                  onChange={(e) => setSelectedPoId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="" disabled>
                    Select Purchase Order Contract
                  </option>
                  {pos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.poNumber} — {p.buyer?.name} ({p.items?.length || 0} line items)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Live PO Fulfillment Preview */}
            {dispatchMode === 'PO_SHIPMENT' && selectedPoId && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-blue-900">
                      PO Line Items & Available Stock Allocation
                    </h4>
                  </div>
                  {loadingPoPreview && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  )}
                </div>

                {poPreviewData?.items && (
                  <div className="rounded-lg border border-blue-200/80 bg-white overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-blue-50/80 text-[10px] font-bold uppercase text-blue-900 border-b border-blue-200">
                        <tr>
                          <th className="px-3 py-2">Variant SKU</th>
                          <th className="px-3 py-2">Size</th>
                          <th className="px-3 py-2">Ordered</th>
                          <th className="px-3 py-2">Shipped</th>
                          <th className="px-3 py-2">Remaining</th>
                          <th className="px-3 py-2 text-right">In-Hand Available</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {poPreviewData.items.map((item: any, idx: number) => {
                          const remaining = item.quantity - (item.shippedQuantity || 0);
                          const isShort = (item.availableInStock || 0) < remaining;
                          return (
                            <tr key={idx}>
                              <td className="px-3 py-2 font-mono font-bold text-slate-800">
                                {item.variantProduct?.sku || item.sku}
                              </td>
                              <td className="px-3 py-2 font-semibold">
                                Size {item.variantProduct?.size || item.size}
                              </td>
                              <td className="px-3 py-2">{item.quantity}</td>
                              <td className="px-3 py-2 text-slate-500">{item.shippedQuantity || 0}</td>
                              <td className="px-3 py-2 font-bold text-blue-700">{remaining}</td>
                              <td className="px-3 py-2 text-right font-bold">
                                <span className={isShort ? 'text-amber-600' : 'text-emerald-700'}>
                                  {item.availableInStock || 0} prs
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Destination & Dispatch Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Delivery Destination / Port Address
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Chittagong Port / Buyer Central Warehouse"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Dispatch Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Challan Remarks & Special Instructions
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Driver contact, truck plate number, container seal details..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('registry')}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Executing Dispatch...</span>
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4" />
                    <span>Dispatch & Generate Challan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mark Delivered Modal (with Delivery Receipt Upload) */}
      {deliveringChallan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setDeliveringChallan(null)}
          />

          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Confirm Shipment Delivery
              </h3>
              <button
                type="button"
                onClick={() => setDeliveringChallan(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Mark challan <strong className="font-mono text-slate-900">{deliveringChallan.challanNumber}</strong> as delivered. You can attach a scanned copy of the signed delivery receipt.
            </p>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Signed Receipt Document (Optional)
              </label>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeliveringChallan(null)}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdateStatus(deliveringChallan.id, 'DELIVERED', receiptFile || undefined)
                }
                disabled={isUpdatingStatus}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50 transition cursor-pointer"
              >
                {isUpdatingStatus ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>Confirm Delivery</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Printable Challan Modal */}
      <ChallanPdfModal
        isOpen={!!selectedChallanForPrint}
        onClose={() => setSelectedChallanForPrint(null)}
        challan={selectedChallanForPrint}
      />
    </div>
  );
}
