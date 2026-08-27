'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Warehouse } from '@/types/warehouse';
import { formatDate, formatNumber } from '@/lib/utils';
import { BatchDetailModal } from '@/components/inventory/batch-detail-modal';
import { BatchLabelModal } from '@/components/inventory/batch-label-modal';
import {
  Boxes,
  Search,
  Barcode,
  AlertTriangle,
  Layers,
  Filter,
  Loader2,
  Package,
  ChevronDown,
  ChevronRight,
  Printer,
  Eye,
  MapPin,
  Calendar,
  FileText,
} from 'lucide-react';

export default function CurrentStockPage() {
  const [viewMode, setViewMode] = useState<'batches' | 'items'>('batches');
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedBatchIds, setExpandedBatchIds] = useState<Record<string, boolean>>({});

  // Modals state
  const [selectedBatchForDetail, setSelectedBatchForDetail] = useState<any | null>(null);
  const [selectedBatchForSticker, setSelectedBatchForSticker] = useState<any | null>(null);

  // 1. Fetch Warehouses for filter dropdown
  const { data: whData } = useQuery({
    queryKey: ['warehouses-stock-filter'],
    queryFn: async () => {
      const res = await api.get('/attributes/warehouses', { params: { per_page: 50 } });
      return res.data?.data;
    },
  });

  // 2. Fetch Batches Overview (Grouped View)
  const { data: batchesData, isLoading: loadingBatches, isFetching: fetchingBatches } = useQuery({
    queryKey: ['inventory-batches', page, search],
    queryFn: async () => {
      const res = await api.get('/inventory/batches', {
        params: {
          page,
          per_page: 25,
          search: search.trim() || undefined,
        },
      });
      return res.data?.data;
    },
    enabled: viewMode === 'batches',
  });

  // 3. Fetch Live Individual Stock Items (Flat View)
  const { data: stockData, isLoading: loadingStock, isFetching: fetchingStock } = useQuery({
    queryKey: ['live-stock', page, search, warehouseFilter, lowStockOnly],
    queryFn: async () => {
      const res = await api.get('/inventory/stock', {
        params: {
          page,
          per_page: 30,
          search: search.trim() || undefined,
          warehouseId: warehouseFilter || undefined,
          lowStock: lowStockOnly ? 'true' : undefined,
        },
      });
      return res.data?.data;
    },
    enabled: viewMode === 'items',
  });

  const warehouses: Warehouse[] = Array.isArray(whData?.data) ? whData.data : Array.isArray(whData) ? whData : [];
  
  // Normalized Batches
  const batches: any[] = Array.isArray(batchesData?.data)
    ? batchesData.data
    : Array.isArray(batchesData)
    ? batchesData
    : [];

  // Normalized Flat Stock Items
  const stockItems: any[] = Array.isArray(stockData?.data)
    ? stockData.data
    : Array.isArray(stockData)
    ? stockData
    : [];

  const toggleBatchExpand = (id: string) => {
    setExpandedBatchIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Summary Metrics
  let totalInHandPairs = 0;
  let totalBatchesCount = batchesData?.total || batches.length;
  let lowStockCount = 0;

  if (viewMode === 'batches') {
    batches.forEach((b) => {
      const avail = b.batchItems?.reduce((sum: number, i: any) => sum + (i.availableQty ?? i.receivedQty ?? 0), 0) || 0;
      totalInHandPairs += avail;
    });
  } else {
    stockItems.forEach((item) => {
      const qty = item.availableQty ?? item.shippableQuantity ?? item.totalQuantity ?? 0;
      totalInHandPairs += qty;
      if (qty < 30) lowStockCount++;
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Current Stock & Inventory Ledger
            </h1>
            <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              Live Balance
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time stock balance grouped by production batches with one-click size breakdown & barcode lookups
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="rounded-xl border border-slate-200 bg-slate-100/80 p-1 flex items-center gap-1 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('batches')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'batches'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="h-3.5 w-3.5 text-blue-600" />
            <span>Grouped by Batches</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('items')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'items'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-indigo-600" />
            <span>All Items & Bins</span>
          </button>
        </div>
      </div>

      {/* KPI Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total In-Hand Pairs
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">
            {formatNumber(totalInHandPairs)} <span className="text-sm font-normal text-slate-500">pairs</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {viewMode === 'batches' ? 'Active Production Batches' : 'Active Location Bins'}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {viewMode === 'batches' ? totalBatchesCount : stockItems.length}{' '}
            <span className="text-sm font-normal text-slate-500">
              {viewMode === 'batches' ? 'batch lots' : 'records'}
            </span>
          </div>
        </div>

        <div
          onClick={() => {
            if (viewMode === 'items') setLowStockOnly(!lowStockOnly);
          }}
          className={`rounded-2xl border p-5 shadow-xs transition ${
            viewMode === 'items' ? 'cursor-pointer hover:border-amber-300' : ''
          } ${lowStockOnly ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200/80 bg-white'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              {viewMode === 'batches' ? 'Inventory Status' : 'Low Stock (< 30 Pairs)'}
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">
              {viewMode === 'batches' ? `${batches.length} Active` : lowStockCount}
            </span>
            <span className="text-xs text-slate-500">
              {viewMode === 'batches' ? 'Ready for order allocation' : lowStockOnly ? '(Filter active)' : '(Click to filter)'}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={
              viewMode === 'batches'
                ? 'Search Batch ID, Number, PO, Product Style...'
                : 'Scan barcode or search SKU / Product / Bin Code...'
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {viewMode === 'items' && (
            <>
              <select
                value={warehouseFilter}
                onChange={(e) => {
                  setWarehouseFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                  lowStockOnly
                    ? 'border-amber-400 bg-amber-50 text-amber-800'
                    : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>&lt; 30 Low Stock</span>
              </button>
            </>
          )}

          {(fetchingBatches || fetchingStock) && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>

      {/* Main Table: Grouped by Batches */}
      {viewMode === 'batches' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          {loadingBatches ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
              <p className="text-xs font-medium text-slate-500">Loading production batches...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Boxes className="h-10 w-10 text-slate-300 mb-2" />
              <h4 className="text-sm font-bold text-slate-800">No inventory batches found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Perform Goods Receipt (Stock-In) to receive incoming production lots.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3.5 w-10"></th>
                    <th className="px-4 py-3.5">Batch Identifier</th>
                    <th className="px-4 py-3.5">Product Style & Color</th>
                    <th className="px-4 py-3.5">PO / Buyer Reference</th>
                    <th className="px-4 py-3.5">In-Hand / Received</th>
                    <th className="px-4 py-3.5">Cartons</th>
                    <th className="px-4 py-3.5">Production Date</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {batches.map((batch) => {
                    const isExpanded = !!expandedBatchIds[batch.id];
                    const items: any[] = batch.batchItems || [];
                    const totalReceived = items.reduce((sum, i) => sum + (i.receivedQty || 0), 0);
                    const totalAvailable = items.reduce((sum, i) => sum + (i.availableQty ?? i.receivedQty ?? 0), 0);
                    const totalPackets = items.reduce((sum, i) => sum + (i.packetCount || 0), 0);

                    const productName = items[0]?.product?.name || batch.masterProduct?.name || 'Footwear Style';
                    const colorName = items[0]?.product?.color?.name || batch.color?.name || 'Color N/A';

                    return (
                      <React.Fragment key={batch.id}>
                        {/* Master Batch Row */}
                        <tr
                          onClick={() => toggleBatchExpand(batch.id)}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          {/* Expand Toggle */}
                          <td className="px-4 py-3.5 text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-blue-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </td>

                          {/* Batch ID */}
                          <td className="px-4 py-3.5">
                            <div className="font-mono font-bold text-slate-900 text-xs">
                              {batch.batch_id || batch.batch_number}
                            </div>
                            {batch.batch_number && batch.batch_number !== batch.batch_id && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Lot: {batch.batch_number}
                              </div>
                            )}
                          </td>

                          {/* Product & Color */}
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">{productName}</div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                              <span>{colorName}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[10px] font-semibold text-slate-400">
                                {items.length} size variants
                              </span>
                            </div>
                          </td>

                          {/* PO / Buyer */}
                          <td className="px-4 py-3.5">
                            {batch.po ? (
                              <div>
                                <div className="font-mono font-semibold text-blue-600 text-xs">
                                  {batch.po.poNumber}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {batch.po.buyer?.name || 'Factory Order'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">General Stock</span>
                            )}
                          </td>

                          {/* Quantities */}
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-emerald-700 text-sm">
                              {formatNumber(totalAvailable)}{' '}
                              <span className="text-xs font-normal text-slate-400">/ {formatNumber(totalReceived)} prs</span>
                            </div>
                          </td>

                          {/* Cartons */}
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-slate-800">{totalPackets}</span>{' '}
                            <span className="text-slate-400 text-[11px]">ctns</span>
                          </td>

                          {/* Production Date */}
                          <td className="px-4 py-3.5 text-slate-600 text-[11px]">
                            {formatDate(batch.productionDate)}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedBatchForDetail(batch)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                title="Inspect Full Details"
                              >
                                <Eye className="h-3.5 w-3.5 text-blue-600" />
                                <span>Inspect</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedBatchForSticker({
                                    batchId: batch.batch_id || batch.batch_number,
                                    batchNumber: batch.batch_number,
                                    productName,
                                    colorName,
                                    gender: batch.gender || 'MALE',
                                    productionDate: batch.productionDate,
                                    expirationDate: batch.expirationDate,
                                    totalPairs: totalReceived,
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                title="Print Batch Sticker"
                              >
                                <Printer className="h-3.5 w-3.5 text-slate-500" />
                                <span>Sticker</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Size Breakdown Table */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70 border-y border-slate-100">
                            <td colSpan={8} className="px-8 py-3.5">
                              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-700">
                                  <span>Sizes & Storage Locations Matrix ({items.length} sizes)</span>
                                  <span className="text-slate-400 font-normal">Click individual size to print bin sticker</span>
                                </div>
                                <table className="w-full text-left text-xs">
                                  <thead className="border-b border-slate-100 bg-slate-50/40 text-[10px] uppercase font-bold text-slate-400">
                                    <tr>
                                      <th className="px-4 py-2">Size / SKU</th>
                                      <th className="px-4 py-2">Available In-Hand</th>
                                      <th className="px-4 py-2">Received Total</th>
                                      <th className="px-4 py-2">Cartons</th>
                                      <th className="px-4 py-2">Storage Bin Location</th>
                                      <th className="px-4 py-2 text-right">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {items.map((it, idx) => (
                                      <tr key={it.id || idx} className="hover:bg-slate-50/60">
                                        <td className="px-4 py-2">
                                          <span className="font-bold text-slate-900">
                                            Size {it.product?.size || it.size || 'N/A'}
                                          </span>
                                          <span className="font-mono text-[10px] text-slate-400 block">
                                            {it.product?.sku || it.sku}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 font-bold text-emerald-700">
                                          {formatNumber(it.availableQty ?? it.receivedQty ?? 0)} prs
                                        </td>
                                        <td className="px-4 py-2 text-slate-600">
                                          {formatNumber(it.receivedQty || 0)} prs
                                        </td>
                                        <td className="px-4 py-2 text-slate-600">
                                          {it.packetCount || 1} ctns
                                        </td>
                                        <td className="px-4 py-2">
                                          {it.location ? (
                                            <div className="flex items-center gap-1 font-mono text-[11px] text-blue-700 font-bold bg-blue-50/70 border border-blue-100 rounded px-1.5 py-0.5 w-fit">
                                              <MapPin className="h-3 w-3 text-blue-500 shrink-0" />
                                              <span>{it.location.code || it.location.name}</span>
                                            </div>
                                          ) : (
                                            <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                                            {it.status || 'AVAILABLE'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Flat Items View */
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          {loadingStock ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
              <p className="text-xs font-medium text-slate-500">Calculating real-time stock levels...</p>
            </div>
          ) : stockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-10 w-10 text-slate-300 mb-2" />
              <h4 className="text-sm font-bold text-slate-800">No stock records found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {lowStockOnly
                  ? 'No items are currently below the 30 pairs low stock threshold.'
                  : 'No inventory batches match your active search and filter criteria.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">SKU & Barcode</th>
                    <th className="px-5 py-3.5">Product Style</th>
                    <th className="px-5 py-3.5">Color & Size</th>
                    <th className="px-5 py-3.5">Storage Location</th>
                    <th className="px-5 py-3.5 text-right">Available Pairs</th>
                    <th className="px-5 py-3.5 text-right">Reserved</th>
                    <th className="px-5 py-3.5 text-right">Total Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {stockItems.map((item, idx) => {
                    const p = item.variantProduct || item.product || item;
                    const loc = item.location || item.storageLocation;
                    const avail = item.availableQty ?? item.shippableQuantity ?? 0;
                    const reserved = item.reservedQty || 0;
                    const total = item.totalQuantity || avail + reserved;
                    const isLow = avail < 30;

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            {p?.sku || item.sku}
                          </div>
                          {p?.barcode && (
                            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 mt-0.5">
                              <Barcode className="h-3 w-3 text-slate-400" />
                              <span>{p.barcode}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">
                            {p?.masterProduct?.name || p?.name || 'Product'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {p?.category?.name || p?.masterProduct?.category?.name || 'Footwear'}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {p?.color?.code && (
                              <span
                                className="h-3 w-3 rounded-full border border-slate-300 shadow-2xs shrink-0"
                                style={{ backgroundColor: p.color.code }}
                              />
                            )}
                            <span className="font-semibold text-slate-800">
                              {p?.color?.name || 'Color'}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-800">
                              Size {p?.size}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {loc ? (
                            <div className="font-mono font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-md inline-block">
                              {loc.code}
                            </div>
                          ) : (
                            <span className="text-slate-400">Default WH</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <span className={`font-bold text-sm ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                              {formatNumber(avail)}
                            </span>
                            <span className="text-slate-400 text-xs font-normal">prs</span>
                            {isLow && (
                              <span title="Low stock alert (< 30 pairs)">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right text-slate-500">
                          {formatNumber(reserved)} prs
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-slate-900">
                          {formatNumber(total)} prs
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

      {/* Batch Detail Slide-Over / Modal */}
      <BatchDetailModal
        isOpen={!!selectedBatchForDetail}
        onClose={() => setSelectedBatchForDetail(null)}
        batch={selectedBatchForDetail}
        onPrintSticker={(b) => {
          setSelectedBatchForDetail(null);
          const items: any[] = b.batchItems || [];
          setSelectedBatchForSticker({
            batchId: b.batch_id || b.batch_number,
            batchNumber: b.batch_number,
            productName: items[0]?.product?.name || b.masterProduct?.name || 'Footwear Style',
            colorName: items[0]?.product?.color?.name || b.color?.name || 'Color',
            gender: b.gender || 'MALE',
            productionDate: b.productionDate,
            expirationDate: b.expirationDate,
            totalPairs: items.reduce((sum, i) => sum + (i.receivedQty || 0), 0),
          });
        }}
      />

      {/* Printable Barcode Lot Sticker Modal */}
      <BatchLabelModal
        isOpen={!!selectedBatchForSticker}
        onClose={() => setSelectedBatchForSticker(null)}
        batchData={selectedBatchForSticker}
      />
    </div>
  );
}
