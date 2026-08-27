'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { VariantProduct } from '@/types/catalog';
import {
  X,
  Edit3,
  Upload,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Save,
  Trash2,
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

  if (!isOpen || !variant) return null;

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
      // 1. Update Variant details
      const payload: any = {
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

      // 2. Upload Picture if selected
      if (selectedFile) {
        const fileFormData = new FormData();
        fileFormData.append('picture', selectedFile);
        await api.post(`/variants/${variant.id}/picture`, fileFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setSuccessMsg('Variant product updated successfully!');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : 'Failed to update variant product.');
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Edit Variant Product
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                SKU: <strong className="text-slate-800">{variant.sku}</strong>
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

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Photo Upload & Preview Section */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
            <label className="mb-2 block text-xs font-bold text-slate-800">
              Variant Product Picture
            </label>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white flex items-center justify-center">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Variant Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <input
                  type="file"
                  id="variant-pic-input"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="variant-pic-input"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5 text-blue-600" />
                  <span>{imagePreview ? 'Change Picture' : 'Upload Picture'}</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Supported formats: JPG, PNG, WEBP (Max 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Color & Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Color <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.colorId}
                onChange={(e) => setFormData({ ...formData, colorId: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="" disabled>Select Color</option>
                {colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Gender Line <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
                <option value="UNISEX">UNISEX</option>
                <option value="KIDS">KIDS</option>
              </select>
            </div>
          </div>

          {/* Size & Items per Packet */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Shoe Size <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                placeholder="e.g. 40, 41, 42"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Items Per Packet (prs/ctn)
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.itemsPerPacket}
                onChange={(e) =>
                  setFormData({ ...formData, itemsPerPacket: Number(e.target.value) || 1 })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Pricing Details */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Cost Price
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Selling Price
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                MRP
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.mrp}
                onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Barcode & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Barcode
              </label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Auto-generated or custom"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
