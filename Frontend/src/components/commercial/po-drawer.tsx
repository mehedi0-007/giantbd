'use client';

import { useState, useEffect } from 'react';
import { PO, CreatePODTO, POStatus, Buyer, LC } from '@/types/commercial';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, ShoppingBag, Edit3, AlertCircle } from 'lucide-react';

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
    orderDate: '',
    deliveryDate: '',
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

  // Filter LCs by selected buyer if selected
  const availableLcs = formData.buyerId
    ? lcs.filter((lc) => lc.buyerId === formData.buyerId)
    : lcs;

  useEffect(() => {
    if (poToEdit) {
      setFormData({
        poNumber: poToEdit.poNumber,
        buyerId: poToEdit.buyerId,
        lcId: poToEdit.lcId || '',
        orderDate: poToEdit.orderDate
          ? new Date(poToEdit.orderDate).toISOString().slice(0, 10)
          : '',
        deliveryDate: poToEdit.deliveryDate
          ? new Date(poToEdit.deliveryDate).toISOString().slice(0, 10)
          : '',
        status: poToEdit.status,
        remarks: poToEdit.remarks || '',
      });
    } else {
      setFormData({
        poNumber: '',
        buyerId: buyers[0]?.id || '',
        lcId: '',
        orderDate: new Date().toISOString().slice(0, 10),
        deliveryDate: '',
        status: 'DRAFT',
        remarks: '',
      });
    }
    setErrorMsg('');
  }, [poToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        ...formData,
        lcId: formData.lcId || undefined,
        deliveryDate: formData.deliveryDate || undefined,
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
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                {poToEdit ? (
                  <Edit3 className="h-5 w-5" />
                ) : (
                  <ShoppingBag className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {poToEdit ? 'Edit Purchase Order' : 'Create Purchase Order'}
                </h3>
                <p className="text-xs text-slate-500">
                  {poToEdit ? `Updating ${poToEdit.poNumber}` : 'Record a new buyer order'}
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

            {/* 1. Letter of Credit (LC) - Mandatory */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Letter of Credit (LC) <span className="text-red-500">*</span>
              </label>
              <select
                required
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
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
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
                    <span className="font-mono text-[10px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-700">
                      {matchedLc.buyer.code}
                    </span>
                  </div>
                  <div className="text-[11px] text-blue-700/80 mt-1 flex items-center gap-3">
                    <span>Country: {matchedLc.buyer.country || 'N/A'}</span>
                    <span>•</span>
                    <span>
                      LC Expiry:{' '}
                      {matchedLc.expiryDate
                        ? new Date(matchedLc.expiryDate).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 2. PO Number */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                PO Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.poNumber}
                onChange={(e) =>
                  setFormData({ ...formData, poNumber: e.target.value.toUpperCase() })
                }
                placeholder="e.g. PO-2026-GIANT-001"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Order Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.orderDate}
                  onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as POStatus })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="IN_PRODUCTION">IN PRODUCTION</option>
                  <option value="READY_FOR_SHIPMENT">READY FOR SHIPMENT</option>
                  <option value="PARTIALLY_SHIPPED">PARTIALLY SHIPPED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Target Delivery Date
              </label>
              <input
                type="date"
                value={formData.deliveryDate || ''}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Order Remarks / Instructions
              </label>
              <textarea
                rows={3}
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Packaging requirements, delivery destination notes..."
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
              disabled={isLoading || !formData.poNumber || !formData.buyerId}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{poToEdit ? 'Save Changes' : 'Create PO & Add Items'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
