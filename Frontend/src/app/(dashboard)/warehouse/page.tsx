'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Warehouse, Zone, SubZone, Rack, StorageLocation } from '@/types/warehouse';
import { BarcodeModal } from '@/components/warehouse/barcode-modal';
import { WarehouseDrawer } from '@/components/warehouse/warehouse-drawer';
import { DataPagination } from '@/components/common/data-pagination';
import {
  Warehouse as WarehouseIcon,
  Search,
  Plus,
  Printer,
  Trash2,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  Layers,
  FolderTree,
  Boxes,
  Barcode,
  Loader2,
} from 'lucide-react';

export default function WarehousePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedLocationForBarcode, setSelectedLocationForBarcode] = useState<StorageLocation | null>(null);

  // Drawer States
  const [drawerType, setDrawerType] = useState<'warehouse' | 'zone' | 'subzone' | 'rack' | 'location'>('warehouse');
  const [drawerParentContext, setDrawerParentContext] = useState<{
    warehouseId?: string;
    zoneId?: string;
    subZoneId?: string;
    rackId?: string;
  }>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Filter States
  const [selectedSubZoneId, setSelectedSubZoneId] = useState<string>('');
  const [selectedRackId, setSelectedRackId] = useState<string>('');
  const [occupancyFilter, setOccupancyFilter] = useState<'ALL' | 'OCCUPIED' | 'EMPTY'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch Warehouses Hierarchy
  const { data: whData, isLoading: loadingWh } = useQuery({
    queryKey: ['warehouses-hierarchy'],
    queryFn: async () => {
      const res = await api.get('/attributes/warehouses', { params: { per_page: 50 } });
      return res.data?.data;
    },
  });

  // Fetch Locations Table
  const { data: locationsData, isLoading: loadingLoc, isFetching } = useQuery({
    queryKey: ['locations-table', page, pageSize, search, selectedWarehouseId, selectedZoneId, selectedSubZoneId, selectedRackId],
    queryFn: async () => {
      const res = await api.get('/attributes/locations', {
        params: {
          page,
          per_page: pageSize,
          search: search.trim() || undefined,
          warehouseId: selectedWarehouseId || undefined,
          zoneId: selectedZoneId || undefined,
          subZoneId: selectedSubZoneId || undefined,
          rackId: selectedRackId || undefined,
        },
      });
      return res.data?.data;
    },
  });

  const warehouses: any[] = Array.isArray(whData?.data) ? whData.data : Array.isArray(whData) ? whData : [];
  const rawLocations: StorageLocation[] = Array.isArray(locationsData?.data) ? locationsData.data : Array.isArray(locationsData) ? locationsData : [];

  const locations = rawLocations.filter((loc: any) => {
    const count = loc._count?.batchItems || loc.batchItems?.length || 0;
    if (occupancyFilter === 'OCCUPIED' && count === 0) return false;
    if (occupancyFilter === 'EMPTY' && count > 0) return false;
    return true;
  });

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExpandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    warehouses.forEach((wh) => {
      allExpanded[wh.id] = true;
      (wh.zones || []).forEach((z: any) => {
        allExpanded[z.id] = true;
        (z.subZones || []).forEach((sz: any) => {
          allExpanded[sz.id] = true;
        });
      });
    });
    setExpandedNodes(allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedNodes({});
  };

  const handleOpenAdd = (
    type: 'warehouse' | 'zone' | 'subzone' | 'rack' | 'location',
    context?: { warehouseId?: string; zoneId?: string; subZoneId?: string; rackId?: string }
  ) => {
    setDrawerType(type);
    setDrawerParentContext(context || {});
    setIsDrawerOpen(true);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedWarehouseId('');
    setSelectedZoneId('');
    setSelectedSubZoneId('');
    setSelectedRackId('');
    setOccupancyFilter('ALL');
  };

  const handleDeleteLocation = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete location ${code}?`)) return;
    try {
      await api.delete(`/attributes/locations/${id}`);
      queryClient.invalidateQueries({ queryKey: ['locations-table'] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete location.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Warehouses & Storage Locations
            </h1>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {locations.length} Locations Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure storage zones, sub-zones, racks, storage locations, and print Code 128 barcode stickers
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenAdd('warehouse')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Warehouse</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAdd('zone', { warehouseId: selectedWarehouseId || undefined })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Zone</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAdd('subzone', { warehouseId: selectedWarehouseId || undefined, zoneId: selectedZoneId || undefined })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Sub-Zone</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAdd('rack', { warehouseId: selectedWarehouseId || undefined, zoneId: selectedZoneId || undefined, subZoneId: selectedSubZoneId || undefined })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Storage Rack</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAdd('location', { warehouseId: selectedWarehouseId || undefined, zoneId: selectedZoneId || undefined, subZoneId: selectedSubZoneId || undefined, rackId: selectedRackId || undefined })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Location</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 4 Cols: Interactive Hierarchy Explorer */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Hierarchy Navigator</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={Object.keys(expandedNodes).some((k) => expandedNodes[k]) ? handleCollapseAll : handleExpandAll}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                {Object.keys(expandedNodes).some((k) => expandedNodes[k]) ? 'Collapse All' : 'Expand All'}
              </button>
              {(selectedWarehouseId || selectedZoneId || selectedSubZoneId || selectedRackId) && (
                <>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Clear Selection
                  </button>
                </>
              )}
            </div>
          </div>

          {loadingWh ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : warehouses.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No warehouses defined. Add a warehouse to start.
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {warehouses.map((wh) => {
                const isSelected = selectedWarehouseId === wh.id && !selectedZoneId;
                const isExpanded = Boolean(expandedNodes[wh.id]); // default minimized/collapsed
                const whZones: any[] = wh.zones || [];

                return (
                  <div key={wh.id} className="rounded-xl border border-slate-100 overflow-hidden">
                    {/* Warehouse Header */}
                    <div
                      className={`flex items-center justify-between p-2.5 cursor-pointer transition ${
                        isSelected ? 'bg-blue-50/80 font-bold text-blue-700' : 'bg-slate-50/60 hover:bg-slate-50'
                      }`}
                      onClick={() => {
                        setSelectedWarehouseId(wh.id);
                        setSelectedZoneId('');
                        setSelectedSubZoneId('');
                        setSelectedRackId('');
                        toggleNode(wh.id);
                      }}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        )}
                        <WarehouseIcon className="h-4 w-4 text-amber-600 shrink-0" />
                        <span className="truncate">{wh.name}</span>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">({wh.code})</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-slate-400 font-normal">
                          {whZones.length} Zones
                        </span>
                        <button
                          type="button"
                          title="Add Zone"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAdd('zone', { warehouseId: wh.id });
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Level 2: Zones */}
                    {isExpanded && whZones.length > 0 && (
                      <div className="pl-4 pr-2 py-1 space-y-1.5 border-t border-slate-100 bg-white">
                        {whZones.map((z) => {
                          const isZSelected = selectedZoneId === z.id && !selectedSubZoneId;
                          const isZExpanded = Boolean(expandedNodes[z.id]); // default minimized
                          const zSubZones: any[] = z.subZones || [];

                          return (
                            <div key={z.id} className="rounded-lg border border-slate-50 bg-slate-50/30 overflow-hidden">
                              {/* Zone Header */}
                              <div
                                onClick={() => {
                                  setSelectedWarehouseId(wh.id);
                                  setSelectedZoneId(z.id);
                                  setSelectedSubZoneId('');
                                  setSelectedRackId('');
                                  toggleNode(z.id);
                                }}
                                className={`flex items-center justify-between py-1.5 px-2 cursor-pointer transition ${
                                  isZSelected
                                    ? 'bg-indigo-50 font-bold text-indigo-700'
                                    : 'text-slate-700 hover:bg-slate-100/60'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  {zSubZones.length > 0 && (
                                    isZExpanded ? (
                                      <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
                                    )
                                  )}
                                  <Layers className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                  <span className="truncate">{z.name}</span>
                                  <span className="font-mono text-[10px] text-slate-400 shrink-0">({z.code})</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    {zSubZones.length} Sub
                                  </span>
                                  <button
                                    type="button"
                                    title="Add SubZone"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAdd('subzone', { warehouseId: wh.id, zoneId: z.id });
                                    }}
                                    className="p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Level 3: SubZones */}
                              {isZExpanded && zSubZones.length > 0 && (
                                <div className="pl-4 pr-1 py-1 space-y-1 bg-white border-t border-slate-100">
                                  {zSubZones.map((sz) => {
                                    const isSZSelected = selectedSubZoneId === sz.id && !selectedRackId;
                                    const isSZExpanded = Boolean(expandedNodes[sz.id]); // default minimized
                                    const szRacks: any[] = sz.racks || [];

                                    return (
                                      <div key={sz.id} className="rounded-md border border-slate-50 overflow-hidden">
                                        <div
                                          onClick={() => {
                                            setSelectedWarehouseId(wh.id);
                                            setSelectedZoneId(z.id);
                                            setSelectedSubZoneId(sz.id);
                                            setSelectedRackId('');
                                            toggleNode(sz.id);
                                          }}
                                          className={`flex items-center justify-between py-1 px-2 cursor-pointer transition ${
                                            isSZSelected
                                              ? 'bg-amber-50 font-bold text-amber-800'
                                              : 'text-slate-600 hover:bg-slate-50'
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 truncate">
                                            {szRacks.length > 0 && (
                                              isSZExpanded ? (
                                                <ChevronDown className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                              ) : (
                                                <ChevronRight className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                              )
                                            )}
                                            <Boxes className="h-3 w-3 text-amber-500 shrink-0" />
                                            <span className="truncate">{sz.name}</span>
                                            <span className="font-mono text-[9px] text-slate-400 shrink-0">({sz.code})</span>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <span className="text-[9px] text-slate-400">
                                              {szRacks.length} Racks
                                            </span>
                                            <button
                                              type="button"
                                              title="Add Rack"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenAdd('rack', { warehouseId: wh.id, zoneId: z.id, subZoneId: sz.id });
                                              }}
                                              className="p-0.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
                                            >
                                              <Plus className="h-2.5 w-2.5" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Level 4: Racks */}
                                        {isSZExpanded && szRacks.length > 0 && (
                                          <div className="pl-4 pr-1 py-0.5 space-y-0.5 bg-slate-50/50">
                                            {szRacks.map((r) => {
                                              const isRSelected = selectedRackId === r.id;
                                              return (
                                                <div
                                                  key={r.id}
                                                  onClick={() => {
                                                    setSelectedWarehouseId(wh.id);
                                                    setSelectedZoneId(z.id);
                                                    setSelectedSubZoneId(sz.id);
                                                    setSelectedRackId(r.id);
                                                  }}
                                                  className={`flex items-center justify-between py-1 px-1.5 rounded cursor-pointer transition text-[11px] ${
                                                    isRSelected
                                                      ? 'bg-emerald-50 font-bold text-emerald-800'
                                                      : 'text-slate-500 hover:bg-white'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-1 truncate">
                                                    <Barcode className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                                                    <span className="truncate">{r.name}</span>
                                                  </div>
                                                  <span className="font-mono text-[9px] text-slate-400">
                                                    {r.code}
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 7 Cols: Storage Locations Table */}
        <div className="lg:col-span-7 space-y-4">
          {/* Multi-Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by location code or barcode..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Warehouse Filter */}
            <select
              value={selectedWarehouseId}
              onChange={(e) => {
                setSelectedWarehouseId(e.target.value);
                setSelectedZoneId('');
                setSelectedSubZoneId('');
                setSelectedRackId('');
              }}
              className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">🏭 All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            {/* Occupancy Filter */}
            <select
              value={occupancyFilter}
              onChange={(e) => setOccupancyFilter(e.target.value as any)}
              className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">📦 All Locations</option>
              <option value="OCCUPIED">🟢 Occupied Locations</option>
              <option value="EMPTY">⚪ Empty Locations</option>
            </select>

            {/* Reset Button */}
            {(search || selectedWarehouseId || selectedZoneId || selectedSubZoneId || selectedRackId || occupancyFilter !== 'ALL') && (
              <button
                type="button"
                onClick={clearFilters}
                className="w-full sm:w-auto shrink-0 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Reset
              </button>
            )}

            {isFetching && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 pr-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              </div>
            )}
          </div>

          {/* Locations Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            {loadingLoc ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                <p className="text-xs font-medium text-slate-500">Loading locations...</p>
              </div>
            ) : locations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Boxes className="h-10 w-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No storage locations found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Create storage locations to assign addresses for incoming stock batches.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenAdd('location')}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Location</span>
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3.5">Location Code & Barcode</th>
                        <th className="px-5 py-3.5">Warehouse Hierarchy Path</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {locations.map((loc) => (
                        <tr key={loc.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Bin Code & Barcode */}
                          <td className="px-5 py-3.5">
                            <div className="font-mono font-bold text-slate-900 text-xs">
                              {loc.code}
                            </div>
                            {loc.barcode && (
                              <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 mt-0.5">
                                <Barcode className="h-3 w-3 text-slate-400" />
                                <span>{loc.barcode}</span>
                              </div>
                            )}
                          </td>

                          {/* Hierarchy Path */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium flex-wrap">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">
                                {loc.warehouse?.name || 'WH'}
                              </span>
                              <span className="text-slate-400">›</span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">
                                {loc.zone?.name || 'Zone'}
                              </span>
                              {loc.subZone && (
                                <>
                                  <span className="text-slate-400">›</span>
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">
                                    {loc.subZone.name}
                                  </span>
                                </>
                              )}
                              {loc.rack && (
                                <>
                                  <span className="text-slate-400">›</span>
                                  <span className="rounded bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                                    Rack {loc.rack.code || loc.rack.name}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5">
                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              {loc.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedLocationForBarcode(loc)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                title="Print Barcode Sticker"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                <span>Sticker</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLocation(loc.id, loc.code)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                                title="Delete Location"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Unified Pagination Toolbar */}
                <DataPagination
                  currentPage={page}
                  totalPages={locationsData?.total_page || 1}
                  totalCount={locationsData?.total || rawLocations.length}
                  pageSize={pageSize}
                  onPageChange={(p) => setPage(p)}
                  onPageSizeChange={(s) => setPageSize(s)}
                  pageSizeOptions={[10, 20, 50, 100]}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Barcode Print Modal */}
      <BarcodeModal
        isOpen={!!selectedLocationForBarcode}
        onClose={() => setSelectedLocationForBarcode(null)}
        location={selectedLocationForBarcode}
      />

      {/* Warehouse / Zone / SubZone / Rack / Location Drawer */}
      <WarehouseDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['warehouses-hierarchy'] });
          queryClient.invalidateQueries({ queryKey: ['zones-dropdown'] });
          queryClient.invalidateQueries({ queryKey: ['subzones-dropdown'] });
          queryClient.invalidateQueries({ queryKey: ['racks-dropdown'] });
          queryClient.invalidateQueries({ queryKey: ['locations-table'] });
        }}
        type={drawerType}
        parentContext={drawerParentContext}
      />
    </div>
  );
}
