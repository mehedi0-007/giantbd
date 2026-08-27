'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { StockOut, StockOutType, StockOutStatus } from '@/types/inventory';
import { PO } from '@/types/commercial';
import { ChallanPdfModal } from '@/components/inventory/challan-pdf-modal';
import { formatDate, formatNumber, calculateBatchAge } from '@/lib/utils';
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
  Boxes,
  ChevronDown,
  ChevronRight,
  MapPin,
  CheckSquare,
  Square,
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

  // In-App Action Modals (Payment & Cancellation)
  const [paymentSettlingChallan, setPaymentSettlingChallan] = useState<StockOut | null>(null);
  const [cancellingChallan, setCancellingChallan] = useState<StockOut | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [cancelNote, setCancelNote] = useState('');

  // Form States for Create Challan
  const [dispatchMode, setDispatchMode] = useState<'PO_SHIPMENT' | 'DIRECT_SALE' | 'SAMPLE_DISPATCH' | 'DAMAGE_SCRAP'>('PO_SHIPMENT');
  const [selectedPoId, setSelectedPoId] = useState('');
  const [destination, setDestination] = useState('');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Interactive Batch & Item Selection States
  const [expandedBatchIds, setExpandedBatchIds] = useState<Record<string, boolean>>({});
  const [selectedItemQuantities, setSelectedItemQuantities] = useState<Record<string, number>>({});

  // 1. Fetch Challans List
  const { data: challansData, isLoading: loadingChallans, isFetching } = useQuery({
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

  // 3. Fetch All Available Batches for Dispatch Selection
  const { data: batchesData, isLoading: loadingBatches } = useQuery({
    queryKey: ['available-batches-for-dispatch'],
    queryFn: async () => {
      const res = await api.get('/inventory/batches', {
        params: {
          per_page: 100,
        },
      });
      return res.data?.data;
    },
    enabled: activeTab === 'create',
  });

  const challans: StockOut[] = Array.isArray(challansData?.data)
    ? challansData.data
    : Array.isArray(challansData)
    ? challansData
    : [];

  const pos: PO[] = Array.isArray(posData?.data) ? posData.data : Array.isArray(posData) ? posData : [];
  
  const allBatches: any[] = Array.isArray(batchesData?.data)
    ? batchesData.data
    : Array.isArray(batchesData)
    ? batchesData
    : [];

  // Filter out completely empty/exhausted batches (in-hand = 0)
  const availableBatches = allBatches.filter((b) => {
    const totalAvail = (b.batchItems || []).reduce((sum: number, i: any) => sum + (i.availableQty ?? i.receivedQty ?? 0), 0);
    return totalAvail > 0;
  });

  // Toggle Batch Accordion
  const toggleBatchExpand = (id: string) => {
    setExpandedBatchIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Toggle Item selection
  const handleItemQtyChange = (batchItemId: string, maxAvailable: number, qty: number) => {
    const validQty = Math.max(0, Math.min(maxAvailable, qty));
    setSelectedItemQuantities((prev) => {
      const updated = { ...prev };
      if (validQty <= 0) {
        delete updated[batchItemId];
      } else {
        updated[batchItemId] = validQty;
      }
      return updated;
    });
  };

  // Select / Deselect All Items in a Batch
  const handleToggleSelectBatch = (batch: any) => {
    const items: any[] = batch.batchItems || [];
    const allSelected = items.every((i) => (selectedItemQuantities[i.id] || 0) > 0);

    setSelectedItemQuantities((prev) => {
      const updated = { ...prev };
      items.forEach((i) => {
        const avail = i.availableQty ?? i.receivedQty ?? 0;
        if (allSelected) {
          delete updated[i.id];
        } else if (avail > 0) {
          updated[i.id] = avail;
        }
      });
      return updated;
    });
  };

  // Compute Total Selected Quantities
  const totalSelectedPairs = Object.values(selectedItemQuantities).reduce((sum, q) => sum + q, 0);
  const totalSelectedItemsCount = Object.keys(selectedItemQuantities).length;

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
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
      queryClient.invalidateQueries({ queryKey: ['live-stock'] });
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
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
      queryClient.invalidateQueries({ queryKey: ['live-stock'] });
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

    const itemsToDispatch = Object.entries(selectedItemQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([batchItemId, issueQty]) => ({
        batchItemId,
        issueQty,
      }));

    if (itemsToDispatch.length === 0) {
      setFormError('Please select at least one batch size item and enter a dispatch quantity > 0.');
      return;
    }

    setIsCreating(true);
    setFormError('');

    try {
      const payload = {
        type: dispatchMode,
        poId: dispatchMode === 'PO_SHIPMENT' ? selectedPoId : undefined,
        destination: destination.trim() || undefined,
        dispatchDate: new Date(dispatchDate).toISOString(),
        note: note.trim() || undefined,
        items: itemsToDispatch,
      };

      const res = await api.post('/inventory/stock-out', payload);
      const createdChallan = res.data?.data?.challan || res.data?.data;

      queryClient.invalidateQueries({ queryKey: ['stock-outs'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
      queryClient.invalidateQueries({ queryKey: ['live-stock'] });

      // Open print modal immediately
      setSelectedChallanForPrint(createdChallan);
      setActiveTab('registry');
      setSelectedPoId('');
      setDestination('');
      setNote('');
      setSelectedItemQuantities({});
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
            {loadingChallans ? (
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
                  <span>Dispatch New Shipment</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
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
                              onClick={() => setSelectedChallanForPrint(c)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                              title="Print Official Challan"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Print</span>
                            </button>

                            {c.status === 'ISSUED' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setDeliveringChallan(c)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer shadow-2xs"
                                  title="Mark as Delivered"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Mark Delivered</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancellingChallan(c);
                                    setCancelNote('');
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                                  title="Cancel Challan & Restore Stock"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  <span>Cancel</span>
                                </button>
                              </>
                            )}

                            {c.status === 'DELIVERED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentSettlingChallan(c);
                                  setPaymentNote('');
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-purple-50 border border-purple-200 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 transition cursor-pointer shadow-2xs"
                                title="Confirm Commercial Settlement"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Payment Received</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CREATE CHALLAN (WITH VISUAL BATCH & SIZE PICKER) */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreateChallan} className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">
                Dispatch Shipment & Generate Delivery Challan
              </h3>
              <p className="text-xs text-slate-500">
                Select available production batches, pick exact size quantities to load, and generate official challan documents.
              </p>
            </div>

            {formError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            {/* Dispatch Mode Selector */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700">
                Dispatch Purpose / Mode <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'PO_SHIPMENT', label: 'PO Export Shipment' },
                  { id: 'DIRECT_SALE', label: 'Direct Local Sale' },
                  { id: 'SAMPLE_DISPATCH', label: 'Sample Dispatch' },
                  { id: 'DAMAGE_SCRAP', label: 'Damage / Scrap' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setDispatchMode(mode.id as any)}
                    className={`rounded-xl border p-3 text-center text-xs font-bold transition cursor-pointer ${
                      dispatchMode === mode.id
                        ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-2xs'
                        : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-50'
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
                  Target Purchase Order Contract <span className="text-red-500">*</span>
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

            {/* AVAILABLE BATCHES ACCORDION PICKER */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Available Warehouse Batches & Sizes ({availableBatches.length} batches in stock)
                  </h4>
                </div>
                <span className="text-xs text-slate-400">
                  Expand each batch dropdown to pick sizes & quantities
                </span>
              </div>

              {loadingBatches ? (
                <div className="flex items-center justify-center py-10 rounded-xl border border-slate-100 bg-slate-50/50">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : availableBatches.length === 0 ? (
                <div className="text-center py-10 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 text-xs">
                  No active stock batches found. Please receive goods via Stock-In first.
                </div>
              ) : (
                <div className="space-y-3">
                  {availableBatches.map((batch) => {
                    const isExpanded = expandedBatchIds[batch.id] !== false; // default expanded
                    const items: any[] = batch.batchItems || [];
                    const totalAvailable = items.reduce((sum, i) => sum + (i.availableQty ?? i.receivedQty ?? 0), 0);
                    const allSelectedInBatch = items.length > 0 && items.every((i) => (selectedItemQuantities[i.id] || 0) > 0);

                    const productName = items[0]?.product?.name || batch.masterProduct?.name || 'Footwear Style';
                    const colorName = items[0]?.product?.color?.name || batch.color?.name || 'Color N/A';

                    return (
                      <div key={batch.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                        {/* Batch Header Row */}
                        <div
                          onClick={() => toggleBatchExpand(batch.id)}
                          className={`flex items-center justify-between p-3.5 cursor-pointer transition select-none ${
                            isExpanded ? 'bg-slate-50/80 border-b border-slate-100' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              className="text-slate-400 hover:text-slate-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBatchExpand(batch.id);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-blue-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSelectBatch(batch);
                              }}
                              className="text-blue-600 hover:text-blue-800 cursor-pointer"
                              title={allSelectedInBatch ? 'Deselect All in Batch' : 'Select All in Batch'}
                            >
                              {allSelectedInBatch ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-300 hover:text-blue-400" />
                              )}
                            </button>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 text-xs">
                                  {batch.batch_id || batch.batch_number}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-700">
                                  {productName} • <span className="text-blue-600">{colorName}</span>
                                </span>
                                {(() => {
                                  const age = calculateBatchAge(batch.productionDate);
                                  return (
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold border ${age.badgeClass}`}>
                                      <span className={`h-1 w-1 rounded-full ${age.dotClass}`} />
                                      <span>{age.label}</span>
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span>Produced: {formatDate(batch.productionDate)}</span>
                                {batch.po && (
                                  <>
                                    <span>•</span>
                                    <span>PO: {batch.po.poNumber}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">In-Hand</span>
                              <span className="font-bold text-emerald-700 text-xs">
                                {formatNumber(totalAvailable)} prs
                              </span>
                            </div>
                            <span className="text-[11px] rounded-md bg-blue-50 text-blue-700 px-2 py-0.5 font-bold">
                              {items.length} Sizes
                            </span>
                          </div>
                        </div>

                        {/* Nested Size Items Matrix */}
                        {isExpanded && (
                          <div className="p-3 bg-white">
                            <table className="w-full text-left text-xs">
                              <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-1">
                                <tr>
                                  <th className="pb-2 w-8"></th>
                                  <th className="pb-2">Size / SKU</th>
                                  <th className="pb-2">Storage Bin Address</th>
                                  <th className="pb-2 text-right">Available in Bin</th>
                                  <th className="pb-2 text-right w-36">Dispatch Quantity</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {items.map((item) => {
                                  const maxAvail = item.availableQty ?? item.receivedQty ?? 0;
                                  const currentQty = selectedItemQuantities[item.id] || 0;
                                  const isSelected = currentQty > 0;

                                  return (
                                    <tr key={item.id} className={`hover:bg-slate-50/50 ${isSelected ? 'bg-blue-50/30' : ''}`}>
                                      <td className="py-2.5">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          disabled={maxAvail <= 0}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              handleItemQtyChange(item.id, maxAvail, maxAvail);
                                            } else {
                                              handleItemQtyChange(item.id, maxAvail, 0);
                                            }
                                          }}
                                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                      </td>
                                      <td className="py-2.5">
                                        <span className="font-bold text-slate-900">
                                          Size {item.product?.size || item.size || 'N/A'}
                                        </span>
                                        <span className="font-mono text-[10px] text-slate-400 block">
                                          {item.product?.sku || item.sku}
                                        </span>
                                      </td>
                                      <td className="py-2.5">
                                        {item.location ? (
                                          <div className="flex items-center gap-1 font-mono text-[11px] text-indigo-700 font-semibold bg-indigo-50/60 border border-indigo-100 rounded px-1.5 py-0.5 w-fit">
                                            <MapPin className="h-3 w-3 text-indigo-500 shrink-0" />
                                            <span>{item.location.code || item.location.name}</span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 text-right font-bold text-emerald-700">
                                        {formatNumber(maxAvail)} prs
                                      </td>
                                      <td className="py-2.5 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <input
                                            type="number"
                                            min={0}
                                            max={maxAvail}
                                            value={currentQty || ''}
                                            placeholder="0"
                                            onChange={(e) =>
                                              handleItemQtyChange(item.id, maxAvail, Number(e.target.value) || 0)
                                            }
                                            className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs text-right font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleItemQtyChange(item.id, maxAvail, maxAvail)}
                                            className="rounded bg-slate-100 px-1.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                                          >
                                            Max
                                          </button>
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
                    );
                  })}
                </div>
              )}
            </div>

            {/* Destination & Dispatch Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Driver contact, truck plate number, container seal details..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Bottom Total Live Summary Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-blue-200 bg-blue-50/60">
              <div>
                <div className="text-xs font-bold text-blue-900">
                  Selected for Dispatch: <span className="text-lg font-extrabold text-blue-700">{formatNumber(totalSelectedPairs)} pairs</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Across {totalSelectedItemsCount} batch size items
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('registry');
                    setSelectedItemQuantities({});
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || totalSelectedPairs === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating Challan...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="h-4 w-4" />
                      <span>Generate Challan ({formatNumber(totalSelectedPairs)} pairs)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Printable 3-Copy Challan PDF Document Modal */}
      <ChallanPdfModal
        isOpen={!!selectedChallanForPrint}
        onClose={() => setSelectedChallanForPrint(null)}
        challan={selectedChallanForPrint}
      />

      {/* Mark Delivered Modal */}
      {deliveringChallan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setDeliveringChallan(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Mark as Delivered</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeliveringChallan(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Confirming delivery for challan <strong className="text-slate-800 font-mono">{deliveringChallan.challanNumber}</strong>. You can optionally upload the signed receiver slip / bill of lading.
            </p>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Receiver Signed Document / Slip (Optional)
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeliveringChallan(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => handleUpdateStatus(deliveringChallan.id, 'DELIVERED', receiptFile || undefined)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <span>Confirm Delivery</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Received Modal (In-App) */}
      {paymentSettlingChallan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setPaymentSettlingChallan(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Confirm Payment Settlement</h3>
                  <p className="text-xs text-slate-500 font-mono">{paymentSettlingChallan.challanNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentSettlingChallan(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-xs space-y-1 text-slate-600">
              <div>
                <span className="text-slate-400">Buyer: </span>
                <strong className="text-slate-800">{paymentSettlingChallan.buyer?.name || paymentSettlingChallan.po?.buyer?.name || 'Factory Dispatch'}</strong>
              </div>
              {paymentSettlingChallan.po && (
                <div>
                  <span className="text-slate-400">PO Number: </span>
                  <span className="font-mono font-semibold text-blue-600">{paymentSettlingChallan.po.poNumber}</span>
                </div>
              )}
              <div>
                <span className="text-slate-400">Dispatch Date: </span>
                <span>{formatDate(paymentSettlingChallan.dispatchDate)}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Payment Reference / Bank TT Notes (Optional)
              </label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g. Bank Wire Ref #TX-8821 / Fully Cleared"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPaymentSettlingChallan(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={async () => {
                  await handleUpdateStatus(paymentSettlingChallan.id, 'PAYMENT_RECEIVED');
                  setPaymentSettlingChallan(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50 cursor-pointer"
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Settlement</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Challan Confirmation Modal (In-App) */}
      {cancellingChallan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setCancellingChallan(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <Ban className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cancel Delivery Challan</h3>
                  <p className="text-xs text-slate-500 font-mono">{cancellingChallan.challanNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancellingChallan(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span>Automatic Stock Restoration</span>
              </div>
              <p>
                Cancelling this challan will immediately restore all dispatched pairs back to active warehouse batch inventory balances.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Cancellation Reason (Optional)
              </label>
              <input
                type="text"
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                placeholder="e.g. Order cancelled by buyer / incorrect quantity"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancellingChallan(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleCancelChallan(cancellingChallan.id, cancellingChallan.challanNumber);
                  setCancellingChallan(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 cursor-pointer"
              >
                <span>Confirm Cancel Challan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
