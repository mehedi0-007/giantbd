'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import {
  X,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Save,
  Layers,
} from 'lucide-react';

interface AdjustBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: any | null;
  onSuccess?: () => void;
}

interface EditableItemRow {
  id: string;
  size: string;
  sku: string;
  availableQty: number;
  receivedQty: number;
  itemsPerPacket: number;
  packetCount: number;
  warehouseId: string;
  zoneId: string;
  subZoneId: string;
  rackId: string;
  locationId: string;
  isModified: boolean;
}

export function AdjustBatchModal({
  isOpen,
  onClose,
  batch,
  onSuccess,
}: AdjustBatchModalProps) {
  const queryClient = useQueryClient();

  const [itemRows, setItemRows] = useState<EditableItemRow[]>([]);
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Cascading bulk location states
  const [bulkWarehouseId, setBulkWarehouseId] = useState('');
  const [bulkZoneId, setBulkZoneId] = useState('');
  const [bulkSubZoneId, setBulkSubZoneId] = useState('');
  const [bulkRackId, setBulkRackId] = useState('');

  // 1. Fetch Warehouses for Cascading Hierarchy
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-adjust-modal'],
    queryFn: async () => {
      const res = await api.get('/attributes/warehouses', { params: { per_page: 50 } });
      return res.data?.data;
    },
    enabled: isOpen,
  });

  // 2. Fetch Storage Locations
  const { data: locationsData } = useQuery({
    queryKey: ['locations-adjust-modal'],
    queryFn: async () => {
      const res = await api.get('/attributes/locations', { params: { per_page: 200 } });
      return res.data?.data;
    },
    enabled: isOpen,
  });

  const warehouses: any[] = Array.isArray(warehousesData?.data)
    ? warehousesData.data
    : Array.isArray(warehousesData)
    ? warehousesData
    : [];

  const locations: any[] = Array.isArray(locationsData?.data)
    ? locationsData.data
    : Array.isArray(locationsData)
    ? locationsData
    : [];

  // Hierarchy Helpers
  const getZonesForWarehouse = (wId: string) => {
    const w = warehouses.find((item) => item.id === wId);
    return w?.zones || [];
  };

  const getSubZonesForZone = (wId: string, zId: string) => {
    const zones = getZonesForWarehouse(wId);
    const z = zones.find((item: any) => item.id === zId);
    return z?.subZones || [];
  };

  const getRacksForSubZone = (wId: string, zId: string, szId: string) => {
    const subZones = getSubZonesForZone(wId, zId);
    const sz = subZones.find((item: any) => item.id === szId);
    return sz?.racks || [];
  };

  const findLocationId = (wId: string, zId?: string, szId?: string, rId?: string) => {
    if (rId) {
      const locByRack = locations.find((l) => l.rackId === rId);
      if (locByRack) return locByRack.id;
    }
    if (szId) {
      const locBySubZone = locations.find((l) => l.subZoneId === szId);
      if (locBySubZone) return locBySubZone.id;
    }
    if (zId) {
      const locByZone = locations.find((l) => l.zoneId === zId);
      if (locByZone) return locByZone.id;
    }
    if (wId) {
      const locByWarehouse = locations.find((l) => l.warehouseId === wId);
      if (locByWarehouse) return locByWarehouse.id;
    }
    return locations[0]?.id || '';
  };

  // Populate form rows when batch changes
  useEffect(() => {
    if (!batch || !isOpen) return;

    const items: any[] = batch.batchItems || [];
    const rows: EditableItemRow[] = items.map((it) => {
      const loc = it.location || {};
      return {
        id: it.id,
        size: it.product?.size || it.size || '—',
        sku: it.product?.sku || it.sku || 'SKU-000',
        availableQty: it.availableQty ?? it.receivedQty ?? 0,
        receivedQty: it.receivedQty ?? 0,
        itemsPerPacket: it.itemsPerPacket ?? 1,
        packetCount: it.packetCount ?? 1,
        warehouseId: loc.warehouse?.id || loc.warehouseId || '',
        zoneId: loc.zone?.id || loc.zoneId || '',
        subZoneId: loc.subZone?.id || loc.subZoneId || '',
        rackId: loc.rack?.id || loc.rackId || '',
        locationId: loc.id || it.locationId || '',
        isModified: false,
      };
    });

    setItemRows(rows);
    setErrorMsg('');
    setSuccessMsg('');
    setAdjustmentNote('');

    if (rows.length > 0) {
      setBulkWarehouseId(rows[0].warehouseId);
      setBulkZoneId(rows[0].zoneId);
      setBulkSubZoneId(rows[0].subZoneId);
      setBulkRackId(rows[0].rackId);
    }
  }, [batch, isOpen]);

  if (!isOpen || !batch) return null;

  const firstProduct = batch.batchItems?.[0]?.product;
  const colorName = firstProduct?.color?.name || batch.color?.name || 'Color N/A';
  const colorCode = firstProduct?.color?.code || batch.color?.code;
  const gender = firstProduct?.gender || batch.gender || 'MALE';
  const materialName = firstProduct?.masterProduct?.material?.name || 'Standard Material';

  // Apply Bulk Location to All Rows
  const handleApplyBulkLocation = (
    wId: string,
    zId: string,
    szId: string,
    rId: string,
  ) => {
    const locId = findLocationId(wId, zId, szId, rId);
    setBulkWarehouseId(wId);
    setBulkZoneId(zId);
    setBulkSubZoneId(szId);
    setBulkRackId(rId);

    setItemRows((prev) =>
      prev.map((r) => ({
        ...r,
        warehouseId: wId,
        zoneId: zId,
        subZoneId: szId,
        rackId: rId,
        locationId: locId,
        isModified: true,
      })),
    );
  };

  // Update specific row
  const updateRow = (index: number, fields: Partial<EditableItemRow>) => {
    const updated = [...itemRows];
    updated[index] = { ...updated[index], ...fields, isModified: true };
    setItemRows(updated);
  };

  // Save All Changes
  const handleSaveAdjustments = async () => {
    const modifiedRows = itemRows.filter((r) => r.isModified);
    if (modifiedRows.length === 0) {
      setErrorMsg('No modifications detected. Change quantities or locations before saving.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Execute PATCH for each modified batch item
      await Promise.all(
        modifiedRows.map((row) =>
          api.patch(`/inventory/batch-items/${row.id}`, {
            quantity: Number(row.availableQty),
            receivedQty: Number(row.receivedQty),
            itemsPerPacket: Number(row.itemsPerPacket),
            locationId: row.locationId || undefined,
            rackId: row.rackId || undefined,
            note: adjustmentNote.trim() || 'Inventory stock-take adjustment',
          }),
        ),
      );

      setSuccessMsg(`Successfully adjusted ${modifiedRows.length} size variants!`);
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
      queryClient.invalidateQueries({ queryKey: ['live-stock'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save batch item adjustments.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalAvailable = itemRows.reduce((sum, r) => sum + (Number(r.availableQty) || 0), 0);
  const totalReceived = itemRows.reduce((sum, r) => sum + (Number(r.receivedQty) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[92vh] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 font-mono">
                  Adjust Batch: {batch.batch_id || batch.batch_number}
                </h3>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                  {gender}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <div className="flex items-center gap-1">
                  {colorCode && (
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-slate-300 shadow-2xs shrink-0"
                      style={{ backgroundColor: colorCode }}
                    />
                  )}
                  <span className="font-semibold text-slate-800">{colorName}</span>
                </div>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                  {materialName}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Alerts */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Cascading Bulk Relocation Panel */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                <span>Bulk Relocate All Sizes</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Quickly assign all size variants to a new storage rack
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {/* Warehouse */}
              <select
                value={bulkWarehouseId}
                onChange={(e) => {
                  const wId = e.target.value;
                  const z = getZonesForWarehouse(wId)[0];
                  const sz = getSubZonesForZone(wId, z?.id)[0];
                  const r = getRacksForSubZone(wId, z?.id, sz?.id)[0];
                  handleApplyBulkLocation(wId, z?.id || '', sz?.id || '', r?.id || '');
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">Warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>

              {/* Zone */}
              <select
                disabled={!bulkWarehouseId}
                value={bulkZoneId}
                onChange={(e) => {
                  const zId = e.target.value;
                  const sz = getSubZonesForZone(bulkWarehouseId, zId)[0];
                  const r = getRacksForSubZone(bulkWarehouseId, zId, sz?.id)[0];
                  handleApplyBulkLocation(bulkWarehouseId, zId, sz?.id || '', r?.id || '');
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Zone</option>
                {getZonesForWarehouse(bulkWarehouseId).map((z: any) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>

              {/* Sub-Zone */}
              <select
                disabled={!bulkZoneId}
                value={bulkSubZoneId}
                onChange={(e) => {
                  const szId = e.target.value;
                  const r = getRacksForSubZone(bulkWarehouseId, bulkZoneId, szId)[0];
                  handleApplyBulkLocation(bulkWarehouseId, bulkZoneId, szId, r?.id || '');
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Sub-Zone</option>
                {getSubZonesForZone(bulkWarehouseId, bulkZoneId).map((sz: any) => (
                  <option key={sz.id} value={sz.id}>
                    {sz.name}
                  </option>
                ))}
              </select>

              {/* Rack Location */}
              <select
                disabled={!bulkSubZoneId}
                value={bulkRackId}
                onChange={(e) => {
                  const rId = e.target.value;
                  handleApplyBulkLocation(bulkWarehouseId, bulkZoneId, bulkSubZoneId, rId);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 font-semibold focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Rack</option>
                {getRacksForSubZone(bulkWarehouseId, bulkZoneId, bulkSubZoneId).map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.code ? `(${r.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Editable Size Items Matrix */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="border-b border-slate-100 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                <tr>
                  <th className="px-3 py-3 w-20">Size</th>
                  <th className="px-3 py-3 w-32">SKU</th>
                  <th className="px-3 py-3 w-28">Available (Prs)</th>
                  <th className="px-3 py-3 w-28">Received (Prs)</th>
                  <th className="px-3 py-3">Warehouse</th>
                  <th className="px-3 py-3">Zone</th>
                  <th className="px-3 py-3">Sub-Zone</th>
                  <th className="px-3 py-3">Rack Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {itemRows.map((row, idx) => {
                  const rowZones = getZonesForWarehouse(row.warehouseId);
                  const rowSubZones = getSubZonesForZone(row.warehouseId, row.zoneId);
                  const rowRacks = getRacksForSubZone(row.warehouseId, row.zoneId, row.subZoneId);

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/60 ${row.isModified ? 'bg-amber-50/40' : ''}`}
                    >
                      {/* Size */}
                      <td className="px-3 py-2">
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 font-bold text-slate-900 text-xs">
                          Size {row.size}
                        </span>
                      </td>

                      {/* SKU */}
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                        {row.sku}
                      </td>

                      {/* Available Qty Input */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.availableQty}
                          onChange={(e) =>
                            updateRow(idx, { availableQty: Number(e.target.value) || 0 })
                          }
                          className="w-full font-bold text-xs rounded-lg border border-slate-200 px-2 py-1 text-emerald-700 bg-white focus:border-blue-500 focus:outline-hidden"
                        />
                      </td>

                      {/* Received Qty Input */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.receivedQty}
                          onChange={(e) =>
                            updateRow(idx, { receivedQty: Number(e.target.value) || 0 })
                          }
                          className="w-full font-semibold text-xs rounded-lg border border-slate-200 px-2 py-1 text-slate-800 bg-white focus:border-blue-500 focus:outline-hidden"
                        />
                      </td>

                      {/* Warehouse Selector */}
                      <td className="px-2 py-2">
                        <select
                          value={row.warehouseId}
                          onChange={(e) => {
                            const wId = e.target.value;
                            const z = getZonesForWarehouse(wId)[0];
                            const sz = getSubZonesForZone(wId, z?.id)[0];
                            const r = getRacksForSubZone(wId, z?.id, sz?.id)[0];
                            const locId = findLocationId(wId, z?.id, sz?.id, r?.id);
                            updateRow(idx, {
                              warehouseId: wId,
                              zoneId: z?.id || '',
                              subZoneId: sz?.id || '',
                              rackId: r?.id || '',
                              locationId: locId,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                        >
                          <option value="">Warehouse</option>
                          {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Zone Selector */}
                      <td className="px-2 py-2">
                        <select
                          disabled={!row.warehouseId || rowZones.length === 0}
                          value={row.zoneId}
                          onChange={(e) => {
                            const zId = e.target.value;
                            const sz = getSubZonesForZone(row.warehouseId, zId)[0];
                            const r = getRacksForSubZone(row.warehouseId, zId, sz?.id)[0];
                            const locId = findLocationId(row.warehouseId, zId, sz?.id, r?.id);
                            updateRow(idx, {
                              zoneId: zId,
                              subZoneId: sz?.id || '',
                              rackId: r?.id || '',
                              locationId: locId,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">Zone</option>
                          {rowZones.map((z: any) => (
                            <option key={z.id} value={z.id}>
                              {z.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Sub-Zone Selector */}
                      <td className="px-2 py-2">
                        <select
                          disabled={!row.zoneId || rowSubZones.length === 0}
                          value={row.subZoneId}
                          onChange={(e) => {
                            const szId = e.target.value;
                            const r = getRacksForSubZone(row.warehouseId, row.zoneId, szId)[0];
                            const locId = findLocationId(row.warehouseId, row.zoneId, szId, r?.id);
                            updateRow(idx, {
                              subZoneId: szId,
                              rackId: r?.id || '',
                              locationId: locId,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">Sub-Zone</option>
                          {rowSubZones.map((sz: any) => (
                            <option key={sz.id} value={sz.id}>
                              {sz.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Rack Selector */}
                      <td className="px-2 py-2">
                        <select
                          disabled={!row.subZoneId || rowRacks.length === 0}
                          value={row.rackId}
                          onChange={(e) => {
                            const rId = e.target.value;
                            const locId = findLocationId(row.warehouseId, row.zoneId, row.subZoneId, rId);
                            updateRow(idx, {
                              rackId: rId,
                              locationId: locId,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 font-semibold focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">Rack</option>
                          {rowRacks.map((r: any) => (
                            <option key={r.id} value={r.id}>
                              {r.name} {r.code ? `(${r.code})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Adjustment Reason Remarks */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Adjustment Reason / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={adjustmentNote}
              onChange={(e) => setAdjustmentNote(e.target.value)}
              placeholder="e.g. Physical inventory count correction, relocated to new rack..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 shrink-0">
          <div className="text-xs text-slate-500">
            Total Available In-Hand:{' '}
            <span className="font-bold text-emerald-700">
              {formatNumber(totalAvailable)} pairs
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAdjustments}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Save className="h-4 w-4 text-white" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Adjustments'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
