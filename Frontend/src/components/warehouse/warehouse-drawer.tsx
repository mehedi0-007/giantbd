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
import { Loader2, Warehouse as WarehouseIcon, AlertCircle, RefreshCw } from 'lucide-react';

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

  // Rack Batch Mode States
  const [rackMode, setRackMode] = useState<'batch' | 'single'>('batch');
  const [rackPrefix, setRackPrefix] = useState('Rack');
  const [rackCodePrefix, setRackCodePrefix] = useState('R');
  const [rackCount, setRackCount] = useState<number>(5);
  const [rackStartIndex, setRackStartIndex] = useState<number>(1);

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
      const res = await api.get('/attributes/racks', { params: { per_page: 50 } });
      return res.data?.data;
    },
    enabled: isOpen && type === 'location',
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
      setRackMode('batch');
      setRackPrefix('Rack');
      setRackCodePrefix('R');
      setRackCount(5);
      setRackStartIndex(1);
      setErrorMsg('');
    }
  }, [isOpen, type, parentContext]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (type === 'warehouse') {
        await api.post('/attributes/warehouses', { name, code: code.toUpperCase(), description: address || undefined });
      } else if (type === 'zone') {
        await api.post('/attributes/zones', { name, code: code.toUpperCase(), warehouseId });
      } else if (type === 'subzone') {
        await api.post('/attributes/subzones', { name, code: code.toUpperCase(), zoneId });
      } else if (type === 'rack') {
        if (rackMode === 'batch') {
          await api.post('/attributes/racks/bulk', {
            subZoneId,
            prefix: rackPrefix.trim() || 'Rack',
            codePrefix: rackCodePrefix.trim().toUpperCase() || 'R',
            count: Number(rackCount) || 1,
            startIndex: Number(rackStartIndex) || 1,
          });
        } else {
          await api.post('/attributes/racks', { name, code: code.toUpperCase(), subZoneId });
        }
      } else if (type === 'location') {
        await api.post('/attributes/locations', {
          code: code.toUpperCase(),
          warehouseId,
          zoneId,
          subZoneId,
          rackId,
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
        return 'Add Storage Rack';
      case 'location':
        return 'Create Storage Location Slot';
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
        return 'Define vertical racking units for storage slots';
      case 'location':
        return 'Create bin / slot identifier for batch items';
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      icon={<WarehouseIcon className="h-5 w-5" />}
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
              Sub-Zone <span className="text-red-500">*</span>
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
              <option value="" disabled>Select Sub-Zone</option>
              {subZones.map((sz) => (
                <option key={sz.id} value={sz.id}>
                  {sz.name} ({sz.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {type === 'location' && (
          <div>
            <label htmlFor="wh-parent-rack" className="mb-1 block text-xs font-semibold text-slate-700">
              Rack <span className="text-red-500">*</span>
            </label>
            <select
              id="wh-parent-rack"
              required
              aria-required="true"
              value={rackId}
              onChange={(e) => setRackId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            >
              <option value="" disabled>Select Storage Rack</option>
              {racks.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 2. Form Inputs */}
        {type !== 'location' && (
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
        )}

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

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-h-[40px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-sm shadow-blue-500/20 disabled:opacity-50 min-h-[40px]"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Save {type.charAt(0).toUpperCase() + type.slice(1)}</span>
          </button>
        </div>
      </form>
    </Drawer>
  );
}
