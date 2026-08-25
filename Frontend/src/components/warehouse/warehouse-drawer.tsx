'use client';

import { useState, useEffect } from 'react';
import { Warehouse, Zone, SubZone, Rack, StorageLocation } from '@/types/warehouse';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, Warehouse as WarehouseIcon, AlertCircle } from 'lucide-react';

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
    setName('');
    setCode('');
    setAddress('');
    setWarehouseId(parentContext?.warehouseId || warehouses[0]?.id || '');
    setZoneId(parentContext?.zoneId || '');
    setSubZoneId(parentContext?.subZoneId || '');
    setRackId(parentContext?.rackId || '');
    setErrorMsg('');
  }, [isOpen, type, parentContext]);

  if (!isOpen) return null;

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
        await api.post('/attributes/racks', { name, code: code.toUpperCase(), subZoneId });
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
        return 'Create Bin Location Slot';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md border-l border-slate-200 bg-white shadow-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <WarehouseIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{getTitle()}</h3>
                <p className="text-xs text-slate-500">Warehouse physical layout management</p>
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

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Parent Hierarchy Pickers */}
            {type !== 'warehouse' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Warehouse *</label>
                <select
                  required
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="" disabled>Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>
            )}

            {(type === 'subzone' || type === 'rack' || type === 'location') && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Zone / Floor *</label>
                <select
                  required
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="" disabled>Select Zone</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name} ({z.code})</option>
                  ))}
                </select>
              </div>
            )}

            {(type === 'rack' || type === 'location') && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Sub-Zone *</label>
                <select
                  required
                  value={subZoneId}
                  onChange={(e) => setSubZoneId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="" disabled>Select Sub-Zone</option>
                  {subZones.map((sz) => (
                    <option key={sz.id} value={sz.id}>{sz.name} ({sz.code})</option>
                  ))}
                </select>
              </div>
            )}

            {type === 'location' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Rack Structure *</label>
                <select
                  required
                  value={rackId}
                  onChange={(e) => setRackId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="" disabled>Select Rack</option>
                  {racks.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                  ))}
                </select>
              </div>
            )}

            {type !== 'location' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ground Floor East Wing"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                {type === 'location' ? 'Location Bin Code *' : 'Code Identifier *'}
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={type === 'location' ? 'e.g. WH1-ZA-SZ1-R1-L01' : 'e.g. WH1'}
                className="w-full font-mono font-bold rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {type === 'warehouse' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Physical Address</label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot 42, Industrial Area, Gazipur..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            )}
          </form>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !code}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save {type}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
