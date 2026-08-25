'use client';

import { useState, useEffect } from 'react';
import { LC, CreateLCDTO, LCStatus, Buyer } from '@/types/commercial';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, FileText, Edit3, AlertCircle } from 'lucide-react';

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
    issueDate: '',
    expiryDate: '',
    shipmentDate: '',
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
        issueDate: lcToEdit.issueDate
          ? new Date(lcToEdit.issueDate).toISOString().slice(0, 10)
          : '',
        expiryDate: lcToEdit.expiryDate
          ? new Date(lcToEdit.expiryDate).toISOString().slice(0, 10)
          : '',
        shipmentDate: lcToEdit.shipmentDate
          ? new Date(lcToEdit.shipmentDate).toISOString().slice(0, 10)
          : '',
        status: lcToEdit.status,
        remarks: lcToEdit.remarks || '',
      });
    } else {
      setFormData({
        lcNumber: '',
        buyerId: buyers[0]?.id || '',
        issueDate: new Date().toISOString().slice(0, 10),
        expiryDate: '',
        shipmentDate: '',
        status: 'OPEN',
        remarks: '',
      });
    }
    setErrorMsg('');
  }, [lcToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (lcToEdit) {
        await api.patch(`/lcs/${lcToEdit.id}`, formData);
      } else {
        await api.post('/lcs', formData);
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
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md border-l border-slate-200 bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                {lcToEdit ? (
                  <Edit3 className="h-5 w-5" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lcToEdit ? 'Edit Letter of Credit' : 'Open Letter of Credit'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lcToEdit ? `Updating ${lcToEdit.lcNumber}` : 'Record a new commercial LC contract'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                LC Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.lcNumber}
                onChange={(e) => setFormData({ ...formData, lcNumber: e.target.value.toUpperCase() })}
                placeholder="e.g. LC-2026-EXPORT-889"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Commercial Buyer <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.buyerId}
                onChange={(e) => setFormData({ ...formData, buyerId: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="" disabled>
                  Select a Buyer
                </option>
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={formData.issueDate || ''}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as LCStatus })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="FULFILLED">FULFILLED</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Latest Shipment Date
                </label>
                <input
                  type="date"
                  value={formData.shipmentDate || ''}
                  onChange={(e) => setFormData({ ...formData, shipmentDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.expiryDate || ''}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Contract Remarks / Terms
              </label>
              <textarea
                rows={3}
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Bank terms, port of entry, special clauses..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </form>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
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
              disabled={isLoading || !formData.lcNumber || !formData.buyerId || !formData.expiryDate}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{lcToEdit ? 'Save Changes' : 'Open LC'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
