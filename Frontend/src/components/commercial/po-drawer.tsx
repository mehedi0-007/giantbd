'use client';

import React, { useState, useEffect } from 'react';
import { PO, CreatePODTO, POStatus, Buyer, LC } from '@/types/commercial';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Drawer } from '@/components/common/drawer';
import { Loader2, ShoppingBag, Edit3, AlertCircle } from 'lucide-react';

interface PoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdId?: string) => void;
  poToEdit?: PO | null;
}

export function PoDrawer({
  isOpen,
  onClose,
  onSuccess,
  poToEdit,
}: PoDrawerProps) {
  const [formData, setFormData] = useState<CreatePODTO>({
    poNumber: '',
    buyerId: '',
    lcId: '',
    status: 'DRAFT',
    remarks: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Buyers for Dropdown
  const { data: buyersData } = useQuery({
    queryKey: ['buyers-dropdown'],
    queryFn: async () => {
      const res = await api.get('/buyers', { params: { per_page: 100 } });
      return res.data?.data;
    },
    enabled: isOpen,
  });

  // Fetch LCs for Dropdown
  const { data: lcsData } = useQuery({
    queryKey: ['lcs-dropdown'],
    queryFn: async () => {
      const res = await api.get('/lc', { params: { per_page: 100 } });
      return res.data?.data;
    },
    enabled: isOpen,
  });

  const buyers: Buyer[] = Array.isArray(buyersData?.data)
    ? buyersData.data
    : Array.isArray(buyersData)
    ? buyersData
    : [];

  const lcs: LC[] = Array.isArray(lcsData?.data)
    ? lcsData.data
    : Array.isArray(lcsData)
    ? lcsData
    : [];

  useEffect(() => {
    if (poToEdit) {
      setFormData({
        poNumber: poToEdit.poNumber,
        buyerId: poToEdit.buyerId,
        lcId: poToEdit.lcId || '',
        status: poToEdit.status,
        remarks: poToEdit.remarks || '',
      });
    } else {
      setFormData({
        poNumber: '',
        buyerId: '',
        lcId: '',
        status: 'DRAFT',
        remarks: '',
      });
    }
    setErrorMsg('');
  }, [poToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        ...formData,
        lcId: formData.lcId || undefined,
      };

      if (poToEdit) {
        await api.patch(`/po/${poToEdit.id}`, payload);
        onSuccess(poToEdit.id);
      } else {
        const res = await api.post('/po', payload);
        const newId = res.data?.data?.id || res.data?.id;
        onSuccess(newId);
      }
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : 'Failed to save Purchase Order details.');
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      icon={poToEdit ? <Edit3 className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
      title={poToEdit ? 'Edit Purchase Order' : 'Create Purchase Order'}
      description={
        poToEdit
          ? `Updating PO ${poToEdit.poNumber}`
          : 'Record a new buyer order and link commercial LC'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" id="po-drawer-form">
        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Letter of Credit (LC) - Mandatory */}
        <div>
          <label htmlFor="po-lc-select" className="mb-1 block text-xs font-semibold text-slate-700">
            Letter of Credit (LC) <span className="text-red-500">*</span>
          </label>
          <select
            id="po-lc-select"
            required
            aria-required="true"
            value={formData.lcId || ''}
            onChange={(e) => {
              const selectedId = e.target.value;
              const matchedLc = lcs.find((l) => l.id === selectedId);
              setFormData({
                ...formData,
                lcId: selectedId,
                buyerId: matchedLc?.buyerId || '',
              });
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
          >
            <option value="" disabled>
              Select Active Letter of Credit (LC)
            </option>
            {lcs.map((lc) => (
              <option key={lc.id} value={lc.id}>
                {lc.lcNumber} (Buyer: {lc.buyer?.name || 'N/A'})
              </option>
            ))}
          </select>
        </div>

        {/* Auto-populated Buyer Info Card */}
        {(() => {
          const matchedLc = lcs.find((l) => l.id === formData.lcId);
          if (!matchedLc?.buyer) return null;
          return (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs">
              <div className="font-bold text-blue-900 flex items-center justify-between">
                <span>🏢 Buyer: {matchedLc.buyer.name}</span>
                <span className="font-mono text-[10px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">
                  {matchedLc.buyer.code}
                </span>
              </div>
              <div className="text-[11px] text-blue-700/80 mt-1 flex items-center gap-3">
                <span>Country: {matchedLc.buyer.country || 'N/A'}</span>
              </div>
            </div>
          );
        })()}

        {/* 2. PO Number */}
        <div>
          <label htmlFor="po-number-input" className="mb-1 block text-xs font-semibold text-slate-700">
            PO Number <span className="text-red-500">*</span>
          </label>
          <input
            id="po-number-input"
            type="text"
            required
            aria-required="true"
            value={formData.poNumber}
            onChange={(e) => setFormData({ ...formData, poNumber: e.target.value.toUpperCase() })}
            placeholder="e.g. PO-2026-8801"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px] font-mono uppercase"
          />
        </div>

        {/* 3. PO Status */}
        <div>
          <label htmlFor="po-status-select" className="mb-1 block text-xs font-semibold text-slate-700">
            Order Status <span className="text-red-500">*</span>
          </label>
          <select
            id="po-status-select"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as POStatus })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
          >
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="IN_PRODUCTION">In Production</option>
            <option value="READY_FOR_SHIPMENT">Ready for Shipment</option>
            <option value="PARTIALLY_SHIPPED">Partially Shipped</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* 4. Remarks */}
        <div>
          <label htmlFor="po-remarks-input" className="mb-1 block text-xs font-semibold text-slate-700">
            Production & Shipment Notes
          </label>
          <textarea
            id="po-remarks-input"
            rows={3}
            value={formData.remarks || ''}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            placeholder="e.g. Initial order for SS26 collection, delivery in Chittagong Port"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

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
            <span>{poToEdit ? 'Save Changes' : 'Create PO & Add Items'}</span>
          </button>
        </div>
      </form>
    </Drawer>
  );
}
