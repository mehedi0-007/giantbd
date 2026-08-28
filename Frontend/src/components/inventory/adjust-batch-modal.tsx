'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { Modal } from '@/components/common/modal';
import {
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

  const getLocationsForRack = (rId: string) => {
    return locations.filter((loc: any) => loc.rackId === rId);
  };

  // Populate Batch Data on Open
  useEffect(() => {
    if (batch && isOpen) {
      const rawItems: any[] = batch.batchItems || [];
      const rows: EditableItemRow[] = rawItems.map((bi) => {
        const loc = bi.location;
        return {
          id: bi.id,
          size: bi.product?.size || bi.size || '',
          sku: bi.product?.sku || '',
          availableQty: bi.availableQty,
          receivedQty: bi.receivedQty,
          itemsPerPacket: bi.itemsPerPacket || 1,
          packetCount: bi.packetCount || 1,
          warehouseId: loc?.warehouseId || loc?.warehouse?.id || '',
          zoneId: loc?.zoneId || loc?.zone?.id || '',
          subZoneId: loc?.subZoneId || loc?.subZone?.id || '',
          rackId: loc?.rackId || loc?.rack?.id || '',
          locationId: bi.locationId || loc?.id || '',
          isModified: false,
        };
      });

      setItemRows(rows);
      setAdjustmentNote('');
      setErrorMsg('');
      setSuccessMsg('');

      if (rows.length > 0 && rows[0].warehouseId) {
        setBulkWarehouseId(rows[0].warehouseId);
        setBulkZoneId(rows[0].zoneId);
        setBulkSubZoneId(rows[0].subZoneId);
        setBulkRackId(rows[0].rackId);
      }
    }
  }, [batch, isOpen]);

  if (!batch) return null;

  const firstProduct = batch.batchItems?.[0]?.product;
  const colorName = firstProduct?.color?.name || batch.color?.name || 'Color N/A';
  const colorCode = firstProduct?.color?.code || batch.color?.code;
  const gender = firstProduct?.gender || batch.gender || 'MALE';

  const applyBulkLocation = (locId: string) => {
    const updated = itemRows.map((r) => ({
      ...r,
      warehouseId: bulkWarehouseId,
      zoneId: bulkZoneId,
      subZoneId: bulkSubZoneId,
      rackId: bulkRackId,
      locationId: locId,
      isModified: true,
    }));
    setItemRows(updated);
  };

  const updateRow = (index: number, fields: Partial<EditableItemRow>) => {
    const updated = [...itemRows];
    updated[index] = { ...updated[index], ...fields, isModified: true };
    setItemRows(updated);
  };

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<Sliders className="h-5 w-5" />}
      title={
        <div className="flex items-center gap-2">
          <span className="font-mono">Adjust Batch: {batch.batch_id || batch.batch_number}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 uppercase">
            {gender}
          </span>
        </div>
      }
      description={
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
          <span>•</span>
          <span>{batch.batchItems?.[0]?.product?.masterProduct?.name || 'Footwear Product'}</span>
        </div>
      }
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500">
            Modified: <strong className="text-amber-700">{itemRows.filter((r) => r.isModified).length}</strong> rows
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-h-[40px]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving || itemRows.filter((r) => r.isModified).length === 0}
              onClick={handleSaveAdjustments}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer disabled:opacity-50 min-h-[40px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Apply Adjustments</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Totals Banner */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="text-xs text-slate-500 block">Total Received Pairs</span>
            <span className="text-base font-extrabold text-slate-900">{formatNumber(totalReceived)} prs</span>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <span className="text-xs text-emerald-700 block">Total Available Stock</span>
            <span className="text-base font-extrabold text-emerald-900">{formatNumber(totalAvailable)} prs</span>
          </div>
        </div>

        {/* Reason / Adjustment Note */}
        <div>
          <label htmlFor="adjust-note" className="mb-1 block text-xs font-semibold text-slate-700">
            Adjustment Reason & Audit Note <span className="text-red-500">*</span>
          </label>
          <input
            id="adjust-note"
            type="text"
            value={adjustmentNote}
            onChange={(e) => setAdjustmentNote(e.target.value)}
            placeholder="e.g. Physical inventory cycle count correction / shelf relocation"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
          />
        </div>

        {/* Bulk Placement Shortcut */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-900">
              Bulk Location Assignment (Apply to All Sizes)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Warehouse */}
            <select
              value={bulkWarehouseId}
              onChange={(e) => {
                setBulkWarehouseId(e.target.value);
                setBulkZoneId('');
                setBulkSubZoneId('');
                setBulkRackId('');
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 min-h-[36px]"
            >
              <option value="">Warehouse</option>
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            {/* Zone */}
            <select
              value={bulkZoneId}
              onChange={(e) => {
                setBulkZoneId(e.target.value);
                setBulkSubZoneId('');
                setBulkRackId('');
              }}
              disabled={!bulkWarehouseId}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 disabled:opacity-50 min-h-[36px]"
            >
              <option value="">Zone / Floor</option>
              {getZonesForWarehouse(bulkWarehouseId).map((z: any) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>

            {/* Sub-Zone */}
            <select
              value={bulkSubZoneId}
              onChange={(e) => {
                setBulkSubZoneId(e.target.value);
                setBulkRackId('');
              }}
              disabled={!bulkZoneId}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 disabled:opacity-50 min-h-[36px]"
            >
              <option value="">Sub-Zone</option>
              {getSubZonesForZone(bulkWarehouseId, bulkZoneId).map((sz: any) => (
                <option key={sz.id} value={sz.id}>
                  {sz.name}
                </option>
              ))}
            </select>

            {/* Rack */}
            <select
              value={bulkRackId}
              onChange={(e) => setBulkRackId(e.target.value)}
              disabled={!bulkSubZoneId}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 disabled:opacity-50 min-h-[36px]"
            >
              <option value="">Rack</option>
              {getRacksForSubZone(bulkWarehouseId, bulkZoneId, bulkSubZoneId).map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          {bulkRackId && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-blue-800 font-medium">Slot:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) applyBulkLocation(e.target.value);
                }}
                className="rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-900 min-h-[36px]"
              >
                <option value="">Choose slot to apply to ALL sizes...</option>
                {getLocationsForRack(bulkRackId).map((loc: any) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} ({loc.name || 'Slot'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Editable Sizes Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Available (prs)</th>
                  <th className="py-2.5 px-3">Received (prs)</th>
                  <th className="py-2.5 px-3">Pairs/Bag</th>
                  <th className="py-2.5 px-3">Location Slot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {itemRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`transition ${row.isModified ? 'bg-amber-50/60' : 'hover:bg-slate-50/50'}`}
                  >
                    <td className="py-2 px-3 font-extrabold text-slate-900 font-mono">
                      EU {row.size}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min={0}
                        value={row.availableQty}
                        onChange={(e) =>
                          updateRow(idx, {
                            availableQty: Number(e.target.value) || 0,
                          })
                        }
                        className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden min-h-[36px]"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min={0}
                        value={row.receivedQty}
                        onChange={(e) =>
                          updateRow(idx, {
                            receivedQty: Number(e.target.value) || 0,
                          })
                        }
                        className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-hidden min-h-[36px]"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min={1}
                        value={row.itemsPerPacket}
                        onChange={(e) =>
                          updateRow(idx, {
                            itemsPerPacket: Number(e.target.value) || 1,
                          })
                        }
                        className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-hidden min-h-[36px]"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={row.locationId}
                        onChange={(e) =>
                          updateRow(idx, {
                            locationId: e.target.value,
                          })
                        }
                        className="w-48 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden min-h-[36px]"
                      >
                        <option value="">Unassigned Location</option>
                        {locations.map((loc: any) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.code} ({loc.warehouse?.name ? `${loc.warehouse.name} • ` : ''}R:{loc.rack?.name || loc.rack?.code || '?'})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
