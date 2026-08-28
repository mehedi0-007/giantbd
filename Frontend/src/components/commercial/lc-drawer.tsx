'use client';

import React, { useState, useEffect } from 'react';
import { LC, CreateLCDTO, LCStatus, Buyer } from '@/types/commercial';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Drawer } from '@/components/common/drawer';
import { Loader2, FileText, Edit3, AlertCircle } from 'lucide-react';

interface LcDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lcToEdit?: LC | null;
}

export function LcDrawer({
  isOpen,
  onClose,
  onSuccess,
  lcToEdit,
}: LcDrawerProps) {
  const [formData, setFormData] = useState<CreateLCDTO>({
    lcNumber: '',
    buyerId: '',
    status: 'OPEN',
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

  const buyers: Buyer[] = Array.isArray(buyersData?.data)
    ? buyersData.data
    : Array.isArray(buyersData)
    ? buyersData
    : [];

  useEffect(() => {
    if (lcToEdit) {
      setFormData({
        lcNumber: lcToEdit.lcNumber,
        buyerId: lcToEdit.buyerId,
        status: lcToEdit.status,
        remarks: lcToEdit.remarks || '',
      });
    } else {
      setFormData({
        lcNumber: '',
        buyerId: '',
        status: 'OPEN',
        remarks: '',
      });
    }
    setErrorMsg('');
  }, [lcToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (lcToEdit) {
        await api.patch(`/lc/${lcToEdit.id}`, formData);
      } else {
        await api.post('/lc', formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : 'Failed to save LC details.');
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      icon={lcToEdit ? <Edit3 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
      title={lcToEdit ? 'Edit Letter of Credit' : 'Open Letter of Credit'}
      description={
        lcToEdit
          ? `Updating LC ${lcToEdit.lcNumber}`
          : 'Record a new commercial Letter of Credit (LC) contract'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" id="lc-drawer-form">
        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Buyer Selection */}
        <div>
          <label htmlFor="lc-buyer" className="mb-1 block text-xs font-semibold text-slate-700">
            Export Buyer <span className="text-red-500">*</span>
          </label>
          <select
            id="lc-buyer"
            required
            aria-required="true"
            value={formData.buyerId}
            onChange={(e) => setFormData({ ...formData, buyerId: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
          >
            <option value="" disabled>Select Buyer</option>
            {buyers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>

        {/* LC Number */}
        <div>
          <label htmlFor="lc-number" className="mb-1 block text-xs font-semibold text-slate-700">
            LC Number <span className="text-red-500">*</span>
          </label>
          <input
            id="lc-number"
            type="text"
            required
            aria-required="true"
            value={formData.lcNumber}
            onChange={(e) => setFormData({ ...formData, lcNumber: e.target.value.toUpperCase() })}
            placeholder="e.g. LC-2026-8899"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px] font-mono uppercase"
          />
        </div>

        {/* LC Status */}
        <div>
          <label htmlFor="lc-status" className="mb-1 block text-xs font-semibold text-slate-700">
            LC Status <span className="text-red-500">*</span>
          </label>
          <select
            id="lc-status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as LCStatus })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
          >
            <option value="OPEN">Open (Active)</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="FULFILLED">Fulfilled (Closed)</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Remarks */}
        <div>
          <label htmlFor="lc-remarks" className="mb-1 block text-xs font-semibold text-slate-700">
            Commercial Remarks & Terms
          </label>
          <textarea
            id="lc-remarks"
            rows={3}
            value={formData.remarks || ''}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            placeholder="e.g. Sight LC 90 days via Standard Chartered Bank Dhaka"
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
            <span>{lcToEdit ? 'Save Changes' : 'Open LC'}</span>
          </button>
        </div>
      </form>
    </Drawer>
  );
}
