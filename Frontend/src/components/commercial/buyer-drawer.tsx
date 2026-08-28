'use client';

import React, { useState, useEffect } from 'react';
import { Buyer, CreateBuyerDTO } from '@/types/commercial';
import api from '@/lib/api';
import { Drawer } from '@/components/common/drawer';
import { Loader2, UserPlus, Edit3, AlertCircle } from 'lucide-react';

interface BuyerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  buyerToEdit?: Buyer | null;
}

export function BuyerDrawer({
  isOpen,
  onClose,
  onSuccess,
  buyerToEdit,
}: BuyerDrawerProps) {
  const [formData, setFormData] = useState<CreateBuyerDTO>({
    code: '',
    name: '',
    country: '',
    email: '',
    phone: '',
    address: '',
    contactPerson: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (buyerToEdit) {
      setFormData({
        code: buyerToEdit.code,
        name: buyerToEdit.name,
        country: buyerToEdit.country || '',
        email: buyerToEdit.email || '',
        phone: buyerToEdit.phone || '',
        address: buyerToEdit.address || '',
        contactPerson: buyerToEdit.contactPerson || '',
      });
    } else {
      setFormData({
        code: '',
        name: '',
        country: '',
        email: '',
        phone: '',
        address: '',
        contactPerson: '',
      });
    }
    setErrorMsg('');
  }, [buyerToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (buyerToEdit) {
        await api.patch(`/buyers/${buyerToEdit.id}`, formData);
      } else {
        await api.post('/buyers', formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : 'Failed to save buyer details.');
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      icon={buyerToEdit ? <Edit3 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
      title={buyerToEdit ? 'Edit Buyer Profile' : 'Add New Commercial Buyer'}
      description={
        buyerToEdit
          ? `Updating ${buyerToEdit.code}`
          : 'Register a new commercial export buyer'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" id="buyer-drawer-form">
        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Buyer Code */}
        <div>
          <label htmlFor="buyer-code" className="mb-1 block text-xs font-semibold text-slate-700">
            Buyer Code <span className="text-red-500">*</span>
          </label>
          <input
            id="buyer-code"
            type="text"
            required
            aria-required="true"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="e.g. HNM-EU"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px] uppercase font-mono"
          />
        </div>

        {/* Buyer Name */}
        <div>
          <label htmlFor="buyer-name" className="mb-1 block text-xs font-semibold text-slate-700">
            Buyer Name <span className="text-red-500">*</span>
          </label>
          <input
            id="buyer-name"
            type="text"
            required
            aria-required="true"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. H&M Global Sourcing"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
          />
        </div>

        {/* Country */}
        <div>
          <label htmlFor="buyer-country" className="mb-1 block text-xs font-semibold text-slate-700">
            Country <span className="text-red-500">*</span>
          </label>
          <input
            id="buyer-country"
            type="text"
            required
            aria-required="true"
            value={formData.country || ''}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            placeholder="e.g. Sweden"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
          />
        </div>

        {/* Contact Person */}
        <div>
          <label htmlFor="buyer-contact" className="mb-1 block text-xs font-semibold text-slate-700">
            Contact Person
          </label>
          <input
            id="buyer-contact"
            type="text"
            value={formData.contactPerson || ''}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            placeholder="e.g. Sarah Jenkins"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
          />
        </div>

        {/* Email & Phone Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="buyer-email" className="mb-1 block text-xs font-semibold text-slate-700">
              Email
            </label>
            <input
              id="buyer-email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="orders@buyer.com"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            />
          </div>
          <div>
            <label htmlFor="buyer-phone" className="mb-1 block text-xs font-semibold text-slate-700">
              Phone
            </label>
            <input
              id="buyer-phone"
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+46 8 796 55 00"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label htmlFor="buyer-address" className="mb-1 block text-xs font-semibold text-slate-700">
            Physical / Registered Address
          </label>
          <textarea
            id="buyer-address"
            rows={3}
            value={formData.address || ''}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Mäster Samuelsgatan 46A, 106 38 Stockholm, Sweden"
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
            <span>{buyerToEdit ? 'Save Changes' : 'Create Buyer'}</span>
          </button>
        </div>
      </form>
    </Drawer>
  );
}
