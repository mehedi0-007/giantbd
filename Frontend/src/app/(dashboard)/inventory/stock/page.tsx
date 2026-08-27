'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Warehouse } from '@/types/warehouse';
import { formatDate, formatNumber, calculateBatchAge } from '@/lib/utils';
import { BatchDetailModal } from '@/components/inventory/batch-detail-modal';
import { BatchLabelModal } from '@/components/inventory/batch-label-modal';
import { AdjustBatchModal } from '@/components/inventory/adjust-batch-modal';
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
  Sliders,
  MapPin,
  Calendar,
  FileText,
} from 'lucide-react';

const formatLocationName = (loc: any) => {
  if (!loc) return 'Unassigned';
  const parts: string[] = [];
  if (loc.warehouse?.name) parts.push(loc.warehouse.name);
  if (loc.zone?.name) parts.push(loc.zone.name);
  if (loc.subZone?.name) parts.push(loc.subZone.name);
  if (loc.rack?.name) parts.push(loc.rack.name);
  else if (loc.name && !loc.name.startsWith('LOC-')) parts.push(loc.name);

  return parts.length > 0 ? parts.join(' • ') : loc.name || loc.code || 'Unassigned';
};

export default function CurrentStockPage() {
  const [viewMode, setViewMode] = useState<'batches' | 'items'>('batches');
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [agingFilter, setAgingFilter] = useState('');
  const [allocationFilter, setAllocationFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedBatchIds, setExpandedBatchIds] = useState<Record<string, boolean>>({});

  // Modals state
  const [selectedBatchForDetail, setSelectedBatchForDetail] = useState<any | null>(null);
  const [selectedBatchForSticker, setSelectedBatchForSticker] = useState<any | null>(null);
  const [selectedBatchForAdjust, setSelectedBatchForAdjust] = useState<any | null>(null);

  // 1. Fetch Warehouses for filter dropdown
  const { data: whData } = useQuery({
    queryKey: ['warehouses-stock-filter'],
    queryFn: async () => {
      const res = await api.get('/attributes/warehouses', { params: { per_page: 50 } });
      return res.data?.data;
    },
  });

  // 2. Fetch Colors for filter dropdown
  const { data: colorsData } = useQuery({
    queryKey: ['colors-stock-filter'],
    queryFn: async () => {
      const res = await api.get('/attributes/colors', { params: { per_page: 100 } });
      return res.data?.data;
    },
  });

  // 3. Fetch Batches Overview (Grouped View)
  const { data: batchesData, isLoading: loadingBatches, isFetching: fetchingBatches } = useQuery({
    queryKey: ['inventory-batches', page, search],
    queryFn: async () => {
      const res = await api.get('/inventory/batches', {
        params: {
          page,
          per_page: 50,
          search: search.trim() || undefined,
        },
      });
      return res.data?.data;
    },
    enabled: viewMode === 'batches',
  });

  // 4. Fetch Live Individual Stock Items (Flat View)
  const { data: stockData, isLoading: loadingStock, isFetching: fetchingStock } = useQuery({
    queryKey: ['live-stock', page, search, warehouseFilter, lowStockOnly],
    queryFn: async () => {
      const res = await api.get('/inventory/stock', {
        params: {
          page,
          per_page: 50,
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
  const colors: any[] = Array.isArray(colorsData?.data) ? colorsData.data : Array.isArray(colorsData) ? colorsData : [];
  
  // Normalized Batches with Client-Side Filter
  const rawBatches: any[] = Array.isArray(batchesData?.data)
    ? batchesData.data
    : Array.isArray(batchesData)
    ? batchesData
    : [];

  const batches = rawBatches.filter((b) => {
    const items: any[] = b.batchItems || [];
    
    // Color filter
    if (colorFilter) {
      const hasColor = items.some(
        (i) => i.product?.color?.name === colorFilter || i.product?.color?.id === colorFilter,
      );
      if (!hasColor) return false;
    }

    // Gender filter (case-insensitive & matches LADY / FEMALE)
    if (genderFilter) {
      const target = genderFilter.toUpperCase();
      const hasGender = items.some((i) => {
        const g = String(i.product?.masterProduct?.gender || i.product?.gender || '').toUpperCase();
        if (target === 'FEMALE' || target === 'LADY') {
          return g === 'FEMALE' || g === 'LADY';
        }
        return g === target;
      });
      if (!hasGender) return false;
    }

    // Aging filter
    if (agingFilter) {
      const ageInfo = calculateBatchAge(b.productionDate);
      if (ageInfo.category !== agingFilter) return false;
    }

    // Allocation filter
    if (allocationFilter === 'PO_ONLY' && !b.po) return false;
    if (allocationFilter === 'GENERAL_ONLY' && b.po) return false;

    // Warehouse filter
    if (warehouseFilter) {
      const inWarehouse = items.some(
        (i) =>
          i.location?.warehouse?.id === warehouseFilter ||
          i.location?.warehouseId === warehouseFilter ||
          i.location?.warehouse?.code === warehouseFilter,
      );
      if (!inWarehouse) return false;
    }

    return true;
  });

  // Normalized Flat Stock Items with Client-Side Filter
  const rawStockItems: any[] = Array.isArray(stockData?.data)
    ? stockData.data
    : Array.isArray(stockData)
    ? stockData
    : [];

  const stockItems = rawStockItems.filter((item) => {
    // Color filter
    if (
      colorFilter &&
      item.product?.color?.name !== colorFilter &&
      item.color?.name !== colorFilter &&
      item.colorId !== colorFilter
    ) {
      return false;
    }
    // Gender filter
    if (genderFilter) {
      const g = String(
        item.product?.masterProduct?.gender ||
          item.masterProduct?.gender ||
          item.gender ||
          '',
      ).toUpperCase();
      const target = genderFilter.toUpperCase();
      if (target === 'FEMALE' || target === 'LADY') {
        if (g !== 'FEMALE' && g !== 'LADY') return false;
      } else if (g !== target) {
        return false;
      }
    }
    return true;
  });

  const toggleBatchExpand = (id: string) => {
    setExpandedBatchIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const hasActiveFilters = Boolean(
    search || colorFilter || genderFilter || agingFilter || allocationFilter || warehouseFilter || lowStockOnly,
  );

  const handleResetFilters = () => {
    setSearch('');
    setColorFilter('');
    setGenderFilter('');
    setAgingFilter('');
    setAllocationFilter('');
    setWarehouseFilter('');
    setLowStockOnly(false);
  };

  // Summary Metrics
  let totalInHandPairs = 0;
  let totalBatchesCount = batches.length;
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
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              viewMode === 'batches'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="h-3.5 w-3.5" />
            <span>📦 By Batches (Grouped)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('items')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              viewMode === 'items'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>🏷️ All Items & Locations</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total In-Hand */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total In-Hand Balance
            </span>
            <Package className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatNumber(totalInHandPairs)}
            </span>
            <span className="text-xs text-slate-500">pairs</span>
          </div>
        </div>

        {/* Total Batches Count */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {viewMode === 'batches' ? 'Active Batches' : 'Stock Positions'}
            </span>
            <Boxes className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">
              {viewMode === 'batches' ? totalBatchesCount : stockItems.length}
            </span>
            <span className="text-xs text-slate-500">
              {viewMode === 'batches' ? 'production lots' : 'active SKUs'}
            </span>
          </div>
        </div>

        {/* Low Stock / Status */}
        <div
          onClick={() => viewMode === 'items' && setLowStockOnly(!lowStockOnly)}
          className={`rounded-2xl border p-5 shadow-xs transition ${
            viewMode === 'items' ? 'cursor-pointer hover:border-amber-400' : ''
          } ${lowStockOnly ? 'border-amber-400 bg-amber-50/50' : 'border-slate-200/80 bg-white'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              {viewMode === 'batches' ? 'Inventory Status' : 'Low Stock (< 30 Pairs)'}
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">
              {viewMode === 'batches' ? `${batches.length} Matching` : lowStockCount}
            </span>
            <span className="text-xs text-slate-500">
              {viewMode === 'batches' ? 'Filtered lots' : lowStockOnly ? '(Filter active)' : '(Click to filter)'}
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Batch ID, PO, SKU, Style Name..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Color Filter */}
          <select
            value={colorFilter}
            onChange={(e) => setColorFilter(e.target.value)}
            className="w-full lg:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="">🎨 All Colors</option>
            {colors.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="w-full lg:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="">👥 All Genders</option>
            <option value="MALE">MALE</option>
            <option value="FEMALE">FEMALE / LADY</option>
            <option value="LADY">LADY</option>
            <option value="KIDS">KIDS</option>
            <option value="JUNIOR">JUNIOR</option>
            <option value="TWIN_JUNIOR">TWIN JUNIOR</option>
          </select>

          {/* Aging Category Filter */}
          {viewMode === 'batches' && (
            <select
              value={agingFilter}
              onChange={(e) => setAgingFilter(e.target.value)}
              className="w-full lg:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">⏳ All Batch Ages</option>
              <option value="FRESH">🟢 Fresh (&lt; 30 Days)</option>
              <option value="NORMAL">🔵 Normal (30 - 90 Days)</option>
              <option value="AGING">🟡 Aging (90 - 180 Days)</option>
              <option value="CRITICAL">🔴 Stale (&gt; 180 Days)</option>
            </select>
          )}

          {/* Allocation Filter */}
          {viewMode === 'batches' && (
            <select
              value={allocationFilter}
              onChange={(e) => setAllocationFilter(e.target.value)}
              className="w-full lg:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">📋 All Allocations</option>
              <option value="PO_ONLY">PO Dedicated Only</option>
              <option value="GENERAL_ONLY">General Unallocated</option>
            </select>
          )}

          {/* Warehouse Filter */}
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="w-full lg:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="">🏭 All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full lg:w-auto shrink-0 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              Reset Filters
            </button>
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
                    <th className="px-4 py-3.5">Color & Gender</th>
                    <th className="px-4 py-3.5">Material</th>
                    <th className="px-4 py-3.5">In-Hand / Received</th>
                    <th className="px-4 py-3.5">Cartons</th>
                    <th className="px-4 py-3.5">Age / Production Date</th>
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
                    const age = calculateBatchAge(batch.productionDate);

                    const firstProduct = items[0]?.product;
                    const colorName = firstProduct?.color?.name || batch.color?.name || 'Color N/A';
                    const colorCode = firstProduct?.color?.code || batch.color?.code;
                    const gender = firstProduct?.gender || batch.gender || 'MALE';
                    const materialName = firstProduct?.masterProduct?.material?.name || 'Standard Material';

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

                          {/* Color & Gender */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              {colorCode && (
                                <span
                                  className="h-3.5 w-3.5 rounded-full border border-slate-300 shadow-2xs shrink-0"
                                  style={{ backgroundColor: colorCode }}
                                />
                              )}
                              <span className="font-bold text-slate-900 text-xs">
                                {colorName}
                              </span>
                              <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-bold uppercase text-[10px] text-slate-700">
                                {gender}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {items.length} size variants
                            </div>
                          </td>

                          {/* Material */}
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                              {materialName}
                            </span>
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

                          {/* Aging & Production Date */}
                          <td className="px-4 py-3.5">
                            <div className="text-slate-700 text-[11px] font-medium">
                              {formatDate(batch.productionDate)}
                            </div>
                            <div className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${age.badgeClass}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${age.dotClass}`} />
                              <span>{age.label}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedBatchForAdjust(batch)}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 transition cursor-pointer"
                                title="Adjust Batch Items & Locations"
                              >
                                <Sliders className="h-3.5 w-3.5 text-amber-600" />
                                <span>Adjust</span>
                              </button>
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
                                    productName: colorName,
                                    colorName,
                                    gender,
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
                                  <span className="text-slate-400 font-normal">Click individual size to print barcode sticker</span>
                                </div>
                                <table className="w-full text-left text-xs">
                                  <thead className="border-b border-slate-100 bg-slate-50/40 text-[10px] uppercase font-bold text-slate-400">
                                    <tr>
                                      <th className="px-4 py-2">Size / SKU</th>
                                      <th className="px-4 py-2">Available In-Hand</th>
                                      <th className="px-4 py-2">Received Total</th>
                                      <th className="px-4 py-2">Cartons</th>
                                      <th className="px-4 py-2">Storage Location</th>
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
                                            <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold bg-slate-100/90 border border-slate-200/80 rounded-md px-2.5 py-1 w-fit">
                                              <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                              <span>{formatLocationName(it.location)}</span>
                                            </div>
                                          ) : (
                                            <span className="text-slate-400 italic text-xs">Unassigned</span>
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
                            <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 rounded-lg w-fit">
                              <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <span>{formatLocationName(loc)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Unassigned</span>
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

      {/* Batch Adjustments Modal */}
      <AdjustBatchModal
        isOpen={!!selectedBatchForAdjust}
        onClose={() => setSelectedBatchForAdjust(null)}
        batch={selectedBatchForAdjust}
      />
    </div>
  );
}
