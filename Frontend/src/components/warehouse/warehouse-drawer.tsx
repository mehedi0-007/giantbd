'use client';

import React, { useState, useEffect } from 'react';
import { Warehouse, Zone, SubZone, Rack } from '@/types/warehouse';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  generateWarehouseCode,
  generateZoneCode,
  generateSubZoneCode,
  generateRackCode,
  generateLocationBarcode,
} from '@/lib/sku-generator';
import { Drawer } from '@/components/common/drawer';
import {
  Loader2,
  Warehouse as WarehouseIcon,
  AlertCircle,
  RefreshCw,
  Boxes,
  Hash,
  Sparkles,
  ArrowRight,
  Layers,
} from 'lucide-react';

interface WarehouseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: 'warehouse' | 'zone' | 'subzone' | 'rack' | 'location';
  parentContext?: {
    warehouseId?: string;
    zoneId?: string;
    subZoneId?: string;
    rackId?: string;
  };
}

export function WarehouseDrawer({
  isOpen,
  onClose,
  onSuccess,
  type,
  parentContext,
}: WarehouseDrawerProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [warehouseId, setWarehouseId] = useState(parentContext?.warehouseId || '');
  const [zoneId, setZoneId] = useState(parentContext?.zoneId || '');
  const [subZoneId, setSubZoneId] = useState(parentContext?.subZoneId || '');
  const [rackId, setRackId] = useState(parentContext?.rackId || '');
  const [isCodeCustomized, setIsCodeCustomized] = useState(false);

  // Bulk Rack Generation Parameters
  const [rackPrefix, setRackPrefix] = useState('Rack');
  const [rackCodePrefix, setRackCodePrefix] = useState('R');
  const [rackCount, setRackCount] = useState<number>(5);
  const [rackStartIndex, setRackStartIndex] = useState<number>(1);
  const [showAdvancedRack, setShowAdvancedRack] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Queries for selectors
  const { data: whData } = useQuery({
    queryKey: ['warehouses-dropdown'],
    queryFn: async () => {
      const res = await api.get('/attributes/warehouses', { params: { per_page: 50 } });
      return res.data?.data;
    },
    enabled: isOpen,
  });

  const { data: zonesData } = useQuery({
    queryKey: ['zones-dropdown', warehouseId],
    queryFn: async () => {
      const res = await api.get('/attributes/zones', { params: { per_page: 50 } });
      return res.data?.data;
    },
    enabled: isOpen && (type === 'subzone' || type === 'rack' || type === 'location'),
  });

  const { data: subZonesData } = useQuery({
    queryKey: ['subzones-dropdown', zoneId],
    queryFn: async () => {
      const res = await api.get('/attributes/subzones', { params: { per_page: 50 } });
      return res.data?.data;
    },
    enabled: isOpen && (type === 'rack' || type === 'location'),
  });

  const { data: racksData } = useQuery({
    queryKey: ['racks-dropdown', subZoneId],
    queryFn: async () => {
      const res = await api.get('/attributes/racks', { params: { per_page: 100 } });
      return res.data?.data;
    },
    enabled: isOpen && !!subZoneId && (type === 'rack' || type === 'location'),
  });

  const warehouses: Warehouse[] = Array.isArray(whData?.data) ? whData.data : Array.isArray(whData) ? whData : [];
  const zones: Zone[] = Array.isArray(zonesData?.data) ? zonesData.data : Array.isArray(zonesData) ? zonesData : [];
  const subZones: SubZone[] = Array.isArray(subZonesData?.data) ? subZonesData.data : Array.isArray(subZonesData) ? subZonesData : [];
  const racks: Rack[] = Array.isArray(racksData?.data) ? racksData.data : Array.isArray(racksData) ? racksData : [];

  useEffect(() => {
    if (isOpen) {
      setName('');
      setCode('');
      setAddress('');
      setWarehouseId(parentContext?.warehouseId || '');
      setZoneId(parentContext?.zoneId || '');
      setSubZoneId(parentContext?.subZoneId || '');
      setRackId(parentContext?.rackId || '');
      setIsCodeCustomized(false);
      setRackPrefix('Rack');
      setRackCodePrefix('R');
      setRackCount(5);
      setRackStartIndex(1);
      setShowAdvancedRack(false);
      setErrorMsg('');
    }
  }, [isOpen, type, parentContext]);

  // Automatically compute next available rack start index when subzone is selected
  useEffect(() => {
    if (type === 'rack' && subZoneId && racks.length > 0) {
      setRackStartIndex(racks.length + 1);
    } else if (type === 'rack' && subZoneId) {
      setRackStartIndex(1);
    }
  }, [subZoneId, racks.length, type]);

  // Compute auto-code based on type and input
  const computeAutoCode = (
    currentName: string,
    currentWhId = warehouseId,
    currentZId = zoneId,
    currentSzId = subZoneId,
    currentRId = rackId,
  ) => {
    if (type === 'warehouse') {
      return generateWarehouseCode(currentName);
    }
    if (type === 'zone') {
      return generateZoneCode(currentName);
    }
    if (type === 'subzone') {
      return generateSubZoneCode(currentName);
    }
    if (type === 'rack') {
      return generateRackCode(currentName);
    }
    if (type === 'location') {
      const whCode = warehouses.find((w) => w.id === currentWhId)?.code;
      const zCode = zones.find((z) => z.id === currentZId)?.code;
      const szCode = subZones.find((sz) => sz.id === currentSzId)?.code;
      const rCode = racks.find((r) => r.id === currentRId)?.code;
      return generateLocationBarcode(whCode, zCode, szCode, rCode);
    }
    return '';
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isCodeCustomized) {
      setCode(computeAutoCode(val));
    }
  };

  const handleRegenerateCode = () => {
    setCode(computeAutoCode(name));
    setIsCodeCustomized(false);
  };

  // Selected entities for live preview
  const selectedWh = warehouses.find((w) => w.id === warehouseId);
  const selectedZ = zones.find((z) => z.id === zoneId);
  const selectedSz = subZones.find((sz) => sz.id === subZoneId);

  // Compute live preview of generated racks and locations
  const count = Math.max(1, Math.min(100, Number(rackCount) || 1));
  const startIdx = Math.max(1, Number(rackStartIndex) || 1);
  const endIdx = startIdx + count - 1;
  const startPad = startIdx < 10 ? `0${startIdx}` : `${startIdx}`;
  const endPad = endIdx < 10 ? `0${endIdx}` : `${endIdx}`;
  const pfx = (rackPrefix || 'Rack').trim();
  const cPfx = (rackCodePrefix || 'R').trim().toUpperCase();

  const previewFirstRackName = `${pfx} ${startPad}`;
  const previewLastRackName = `${pfx} ${endPad}`;
  const previewFirstRackCode = `${cPfx}${startPad}`;
  const previewLastRackCode = `${cPfx}${endPad}`;

  const whCode = selectedWh?.code || 'WH';
  const zCode = selectedZ?.code || 'ZN';
  const szCode = selectedSz?.code || 'SZ';

  const previewFirstBarcode = `${whCode}-${zCode}-${szCode}-${previewFirstRackCode}`;
  const previewLastBarcode = `${whCode}-${zCode}-${szCode}-${previewLastRackCode}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (type === 'warehouse') {
        await api.post('/attributes/warehouses', {
          name: name.trim(),
          code: code.toUpperCase(),
          description: address.trim() || undefined,
        });
      } else if (type === 'zone') {
        await api.post('/attributes/zones', {
          name: name.trim(),
          code: code.toUpperCase(),
          warehouseId,
        });
      } else if (type === 'subzone') {
        await api.post('/attributes/subzones', {
          name: name.trim(),
          code: code.toUpperCase(),
          zoneId,
        });
      } else if (type === 'rack') {
        if (!subZoneId) {
          setErrorMsg('Please select a Sub-Zone for the racks.');
          setIsLoading(false);
          return;
        }

        await api.post('/attributes/racks/bulk', {
          subZoneId,
          prefix: pfx,
          codePrefix: cPfx,
          count,
          startIndex: startIdx,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || `Failed to create ${type}.`;
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'warehouse':
        return 'Add New Warehouse';
      case 'zone':
        return 'Add Zone / Floor';
      case 'subzone':
        return 'Add Sub-Zone Area';
      case 'rack':
        return 'Generate Storage Racks in Bulk';
      case 'location':
        return 'Generate Storage Racks & Locations';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'warehouse':
        return 'Register a physical building or warehouse facility';
      case 'zone':
        return 'Create a designated section or floor inside warehouse';
      case 'subzone':
        return 'Define specific aisles or storage sections';
      case 'rack':
      case 'location':
        return 'Specify the number of racks to provision. Storage location barcodes are auto-generated.';
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      icon={<WarehouseIcon className="h-5 w-5 text-blue-600" />}
      title={getTitle()}
      description={getDescription()}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" id="warehouse-drawer-form">
        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Parent Selectors Hierarchy */}
        {(type === 'zone' || type === 'subzone' || type === 'rack' || type === 'location') && (
          <div>
            <label htmlFor="wh-parent-wh" className="mb-1 block text-xs font-semibold text-slate-700">
              Warehouse <span className="text-red-500">*</span>
            </label>
            <select
              id="wh-parent-wh"
              required
              aria-required="true"
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                setZoneId('');
                setSubZoneId('');
                setRackId('');
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            >
              <option value="" disabled>Select Warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {(type === 'subzone' || type === 'rack' || type === 'location') && (
          <div>
            <label htmlFor="wh-parent-zone" className="mb-1 block text-xs font-semibold text-slate-700">
              Zone / Floor <span className="text-red-500">*</span>
            </label>
            <select
              id="wh-parent-zone"
              required
              aria-required="true"
              value={zoneId}
              onChange={(e) => {
                setZoneId(e.target.value);
                setSubZoneId('');
                setRackId('');
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            >
              <option value="" disabled>Select Zone</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {(type === 'rack' || type === 'location') && (
          <div>
            <label htmlFor="wh-parent-subzone" className="mb-1 block text-xs font-semibold text-slate-700">
              Sub-Zone / Aisle <span className="text-red-500">*</span>
            </label>
            <select
              id="wh-parent-subzone"
              required
              aria-required="true"
              value={subZoneId}
              onChange={(e) => {
                setSubZoneId(e.target.value);
                setRackId('');
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            >
              <option value="" disabled>Select Sub-Zone / Aisle</option>
              {subZones.map((sz) => (
                <option key={sz.id} value={sz.id}>
                  {sz.name} ({sz.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 2A. BULK RACK CREATION SECTION */}
        {(type === 'rack' || type === 'location') ? (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="rounded-2xl border border-[#3b66b7]/20 bg-[#3b66b7]/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="wh-rack-count" className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Boxes className="h-4 w-4 text-[#3b66b7]" />
                  <span>Number of Storage Racks to Create</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  {[5, 10, 20].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRackCount(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        rackCount === preset
                          ? 'bg-[#3b66b7] text-white shadow-xs'
                          : 'bg-white border border-[#3b66b7]/30 text-[#3b66b7] hover:bg-[#3b66b7]/10'
                      }`}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="wh-rack-count"
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={rackCount}
                  onChange={(e) => setRackCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-base font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Toggle Advanced Naming */}
              <button
                type="button"
                onClick={() => setShowAdvancedRack((prev) => !prev)}
                className="text-[11px] font-semibold text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{showAdvancedRack ? 'Hide naming options' : 'Customize prefix & start number'}</span>
              </button>

              {showAdvancedRack && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-100">
                  <div>
                    <label htmlFor="wh-rack-prefix" className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Name Prefix
                    </label>
                    <input
                      id="wh-rack-prefix"
                      type="text"
                      value={rackPrefix}
                      onChange={(e) => setRackPrefix(e.target.value)}
                      placeholder="Rack"
                      className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="wh-rack-codeprefix" className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Code Prefix
                    </label>
                    <input
                      id="wh-rack-codeprefix"
                      type="text"
                      value={rackCodePrefix}
                      onChange={(e) => setRackCodePrefix(e.target.value.toUpperCase())}
                      placeholder="R"
                      className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label htmlFor="wh-rack-startidx" className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Start Index
                    </label>
                    <input
                      id="wh-rack-startidx"
                      type="number"
                      min={1}
                      value={rackStartIndex}
                      onChange={(e) => setRackStartIndex(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Live Generation Preview Strip */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Automatic Generation Preview ({count} Racks & Locations)</span>
              </div>

              <div className="text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Rack Names:</span>
                  <span className="font-semibold text-slate-900">
                    {count === 1 ? previewFirstRackName : `${previewFirstRackName} → ${previewLastRackName}`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Rack Codes:</span>
                  <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded">
                    {count === 1 ? previewFirstRackCode : `${previewFirstRackCode} ... ${previewLastRackCode}`}
                  </span>
                </div>

                <div className="pt-1 border-t border-slate-200/60">
                  <div className="text-[11px] text-slate-500 mb-0.5">Barcode Storage Locations:</div>
                  <div className="font-mono text-[11px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200/60 px-2 py-1 rounded truncate">
                    {count === 1 ? previewFirstBarcode : `${previewFirstBarcode}  ⟶  ${previewLastBarcode}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 2B. SINGLE ENTITY NAME & CODE (For Warehouse, Zone, SubZone) */
          <>
            <div>
              <label htmlFor="wh-entity-name" className="mb-1 block text-xs font-semibold text-slate-700">
                {type.charAt(0).toUpperCase() + type.slice(1)} Name <span className="text-red-500">*</span>
              </label>
              <input
                id="wh-entity-name"
                type="text"
                required
                aria-required="true"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={`e.g. Main ${type.charAt(0).toUpperCase() + type.slice(1)}`}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
              />
            </div>

            {/* Code Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="wh-entity-code" className="block text-xs font-semibold text-slate-700">
                  Identifier Code <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Auto-Code</span>
                </button>
              </div>
              <input
                id="wh-entity-code"
                type="text"
                required
                aria-required="true"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setIsCodeCustomized(true);
                }}
                placeholder="e.g. WH-01"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px] font-mono uppercase"
              />
            </div>

            {/* Warehouse Description / Address */}
            {type === 'warehouse' && (
              <div>
                <label htmlFor="wh-address" className="mb-1 block text-xs font-semibold text-slate-700">
                  Physical Address / Location Details
                </label>
                <textarea
                  id="wh-address"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Plot 14, Export Processing Zone, Gazipur, Dhaka"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}
          </>
        )}

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-h-[40px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-giant-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#3b66b7]/20 disabled:opacity-50 transition cursor-pointer min-h-[40px]"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>
              {type === 'rack' || type === 'location'
                ? `Generate ${count} Storage ${count === 1 ? 'Rack' : 'Racks'}`
                : `Save ${type.charAt(0).toUpperCase() + type.slice(1)}`}
            </span>
          </button>
        </div>
      </form>
    </Drawer>
  );
}
