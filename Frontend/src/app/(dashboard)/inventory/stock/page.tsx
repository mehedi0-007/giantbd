'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { VariantProduct } from '@/types/catalog';
import { Warehouse } from '@/types/warehouse';
import { formatNumber } from '@/lib/utils';
import {
  Boxes,
  Search,
  Barcode,
  AlertTriangle,
  Layers,
  Filter,
  CheckCircle2,
  Loader2,
  Package,
} from 'lucide-react';

export default function CurrentStockPage() {
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);

  // 1. Fetch Warehouses for dropdown
  const { data: whData } = useQuery({
    queryKey: ['warehouses-stock-filter'],
    queryFn: async () => {
      const res = await api.get('/attributes/warehouses', { params: { per_page: 50 } });
      return res.data?.data;
    },
  });

  // 2. Fetch Live Stock Items
  const { data: stockData, isLoading, isFetching } = useQuery({
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
  });

  const warehouses: Warehouse[] = Array.isArray(whData?.data) ? whData.data : Array.isArray(whData) ? whData : [];
  const stockItems: any[] = Array.isArray(stockData?.data)
    ? stockData.data
    : Array.isArray(stockData)
    ? stockData
    : [];

  const totalCount = stockData?.total || stockItems.length;
  const totalPages = stockData?.total_page || 1;

  // Calculate summary metrics
  let totalShippable = 0;
  let lowStockCount = 0;

  stockItems.forEach((item) => {
    const qty = item.availableQty ?? item.shippableQuantity ?? item.totalQuantity ?? 0;
    totalShippable += qty;
    if (qty < 30) {
      lowStockCount++;
    }
  });

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
            Real-time stock balance across all warehouse bins with barcode lookup and low stock warnings (&lt; 30 pairs)
          </p>
        </div>
      </div>

      {/* KPI Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total In-Hand Pairs
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">
            {formatNumber(totalShippable)} <span className="text-sm font-normal text-slate-500">pairs</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active Inventory Records
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {totalCount} <span className="text-sm font-normal text-slate-500">bin items</span>
          </div>
        </div>

        <div
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`rounded-2xl border p-5 shadow-xs cursor-pointer transition ${
            lowStockOnly
              ? 'border-amber-500 bg-amber-50/50'
              : 'border-slate-200/80 bg-white hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Low Stock (&lt; 30 Pairs)
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">
              {lowStockCount}
            </span>
            <span className="text-xs text-slate-500">
              {lowStockOnly ? '(Filter active - click to clear)' : '(Click to filter)'}
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
            placeholder="Scan barcode or search SKU / Product / Bin Code..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
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

          {isFetching && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>

      {/* Stock Items Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {isLoading ? (
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
                      {/* SKU & Barcode */}
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

                      {/* Product Name */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {p?.masterProduct?.name || p?.name || 'Product'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {p?.category?.name || p?.masterProduct?.category?.name || 'Footwear'}
                        </div>
                      </td>

                      {/* Color & Size */}
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

                      {/* Storage Location */}
                      <td className="px-5 py-4">
                        {loc ? (
                          <div className="font-mono font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-md inline-block">
                            {loc.code}
                          </div>
                        ) : (
                          <span className="text-slate-400">Default WH</span>
                        )}
                      </td>

                      {/* Available Pairs */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <span
                            className={`font-bold text-sm ${
                              isLow ? 'text-amber-600' : 'text-slate-900'
                            }`}
                          >
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

                      {/* Reserved */}
                      <td className="px-5 py-4 text-right text-slate-500">
                        {formatNumber(reserved)} prs
                      </td>

                      {/* Total */}
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
    </div>
  );
}
