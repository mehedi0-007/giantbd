'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { VariantProduct } from '@/types/catalog';
import { Modal } from '@/components/common/modal';
import {
  Edit3,
  Upload,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface EditVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: VariantProduct | null;
  onSuccess?: () => void;
}

export function EditVariantModal({
  isOpen,
  onClose,
  variant,
  onSuccess,
}: EditVariantModalProps) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    size: '',
    colorId: '',
    gender: 'MALE',
    itemsPerPacket: 1,
    costPrice: '',
    sellingPrice: '',
    mrp: '',
    barcode: '',
    status: 'ACTIVE',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Colors for Color Dropdown
  const { data: colorsData } = useQuery({
    queryKey: ['colors-edit-variant'],
    queryFn: async () => {
      const res = await api.get('/attributes/colors', { params: { per_page: 100 } });
      return res.data?.data;
    },
    enabled: isOpen,
  });

  const colors: any[] = Array.isArray(colorsData?.data)
    ? colorsData.data
    : Array.isArray(colorsData)
    ? colorsData
    : [];

  useEffect(() => {
    if (variant && isOpen) {
      setFormData({
        size: variant.size || '',
        colorId: variant.colorId || variant.color?.id || '',
        gender: (variant.gender as any) || 'MALE',
        itemsPerPacket: variant.itemsPerPacket || 1,
        costPrice: variant.costPrice != null ? String(variant.costPrice) : '',
        sellingPrice: variant.sellingPrice != null ? String(variant.sellingPrice) : '',
        mrp: variant.mrp != null ? String(variant.mrp) : '',
        barcode: variant.barcode || '',
        status: (variant.status as any) || 'ACTIVE',
      });

      setSelectedFile(null);
      if (variant.picture) {
        setImagePreview(
          variant.picture.startsWith('http')
            ? variant.picture
            : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/${variant.picture}`,
        );
      } else {
        setImagePreview(null);
      }

      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [variant, isOpen]);

  if (!variant) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload: Record<string, any> = {
        size: formData.size.trim().toUpperCase(),
        colorId: formData.colorId,
        gender: formData.gender,
        itemsPerPacket: Number(formData.itemsPerPacket) || 1,
        costPrice: formData.costPrice ? Number(formData.costPrice) : undefined,
        sellingPrice: formData.sellingPrice ? Number(formData.sellingPrice) : undefined,
        mrp: formData.mrp ? Number(formData.mrp) : undefined,
        barcode: formData.barcode.trim() || undefined,
        status: formData.status,
      };

      await api.patch(`/variants/${variant.id}`, payload);

      if (selectedFile) {
        const fileFormData = new FormData();
        fileFormData.append('picture', selectedFile);
        await api.post(`/variants/${variant.id}/picture`, fileFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      queryClient.invalidateQueries({ queryKey: ['master-product-detail'] });
      queryClient.invalidateQueries({ queryKey: ['variant-products'] });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : 'Failed to update variant.');
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<Edit3 className="h-5 w-5" />}
      title="Edit Variant Product"
      description={
        <>
          Editing SKU <strong className="font-mono text-blue-700">{variant.sku}</strong>
        </>
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" id="edit-variant-form">
        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Size & Color Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="evm-size" className="mb-1 block text-xs font-semibold text-slate-700">
              Size <span className="text-red-500">*</span>
            </label>
            <input
              id="evm-size"
              type="text"
              required
              aria-required="true"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value.toUpperCase() })}
              placeholder="e.g. 42"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px] font-mono font-bold uppercase"
            />
          </div>

          <div>
            <label htmlFor="evm-color" className="mb-1 block text-xs font-semibold text-slate-700">
              Color <span className="text-red-500">*</span>
            </label>
            <select
              id="evm-color"
              required
              aria-required="true"
              value={formData.colorId}
              onChange={(e) => setFormData({ ...formData, colorId: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            >
              <option value="" disabled>Select Color</option>
              {colors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Gender, Items Per Packet, Status Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="evm-gender" className="mb-1 block text-xs font-semibold text-slate-700">
              Gender
            </label>
            <select
              id="evm-gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            >
              <option value="MALE">Male</option>
              <option value="LADY">Lady</option>
              <option value="KIDS">Kids</option>
              <option value="JUNIOR">Junior</option>
              <option value="TWIN_JUNIOR">Twin Junior</option>
            </select>
          </div>

          <div>
            <label htmlFor="evm-packet" className="mb-1 block text-xs font-semibold text-slate-700">
              Pairs / Bag
            </label>
            <input
              id="evm-packet"
              type="number"
              min={1}
              value={formData.itemsPerPacket}
              onChange={(e) => setFormData({ ...formData, itemsPerPacket: Number(e.target.value) || 1 })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            />
          </div>

          <div>
            <label htmlFor="evm-status" className="mb-1 block text-xs font-semibold text-slate-700">
              Status
            </label>
            <select
              id="evm-status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="evm-cost" className="mb-1 block text-xs font-semibold text-slate-700">
              Cost Price ($)
            </label>
            <input
              id="evm-cost"
              type="number"
              step="0.01"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            />
          </div>
          <div>
            <label htmlFor="evm-selling" className="mb-1 block text-xs font-semibold text-slate-700">
              Selling Price ($)
            </label>
            <input
              id="evm-selling"
              type="number"
              step="0.01"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            />
          </div>
          <div>
            <label htmlFor="evm-mrp" className="mb-1 block text-xs font-semibold text-slate-700">
              MRP ($)
            </label>
            <input
              id="evm-mrp"
              type="number"
              step="0.01"
              value={formData.mrp}
              onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            />
          </div>
        </div>

        {/* Barcode & Picture Upload */}
        <div>
          <label htmlFor="evm-barcode" className="mb-1 block text-xs font-semibold text-slate-700">
            Barcode / EAN
          </label>
          <input
            id="evm-barcode"
            type="text"
            value={formData.barcode}
            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            placeholder="e.g. 890123456789"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px] font-mono"
          />
        </div>

        <div>
          <label htmlFor="evm-picture" className="mb-1 block text-xs font-semibold text-slate-700">
            Variant Photo
          </label>
          <input
            id="evm-picture"
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleFileChange}
            className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer min-h-[40px]"
          />
          {imagePreview && (
            <div className="mt-2 flex items-center gap-3">
              <img
                src={imagePreview}
                alt="Variant preview"
                className="h-14 w-14 rounded-lg object-cover border border-slate-200"
              />
              <span className="text-xs text-slate-500">Image selected for upload</span>
            </div>
          )}
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
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-sm shadow-blue-500/20 disabled:opacity-50 min-h-[40px]"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Save Variant Changes</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
