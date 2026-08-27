'use client';

import { useState } from 'react';
import { Color, ProductGender, UnitOfMeasurement } from '@/types/catalog';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { generateVariantSku } from '@/lib/sku-generator';
import { X, Loader2, Wand2, AlertCircle, Plus, Check } from 'lucide-react';

interface BulkVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  masterProductId: string;
  masterSku: string;
}

const COMMON_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];

export function BulkVariantModal({
  isOpen,
  onClose,
  onSuccess,
  masterProductId,
  masterSku,
}: BulkVariantModalProps) {
  const [selectedColorId, setSelectedColorId] = useState('');
  const [selectedGender, setSelectedGender] = useState<ProductGender>('MALE');
  const [uom, setUom] = useState<UnitOfMeasurement>('PAIR');
  const [itemsPerPacket, setItemsPerPacket] = useState<number>(1);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['38', '39', '40', '41', '42', '43']);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Colors for Dropdown
  const { data: colorsData } = useQuery({
    queryKey: ['colors-dropdown'],
    queryFn: async () => {
      const res = await api.get('/attributes/colors', { params: { per_page: 100 } });
      return res.data?.data;
    },
    enabled: isOpen,
  });

  const colors: Color[] = Array.isArray(colorsData?.data)
    ? colorsData.data
    : Array.isArray(colorsData)
    ? colorsData
    : [];

  if (!isOpen) return null;

  const toggleSize = (size: string) => {
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter((s) => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size].sort((a, b) => Number(a) - Number(b)));
    }
  };

  const handleAddCustomSize = () => {
    const val = customSizeInput.trim();
    if (val && !selectedSizes.includes(val)) {
      setSelectedSizes([...selectedSizes, val]);
      setCustomSizeInput('');
    }
  };

  const handleSelectAllPresets = () => {
    setSelectedSizes(COMMON_SIZES);
  };

  const handleClearSizes = () => {
    setSelectedSizes([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColorId) {
      setErrorMsg('Please select a color.');
      return;
    }
    if (selectedSizes.length === 0) {
      setErrorMsg('Please select at least one size to generate variants.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      await api.post('/variants/bulk', {
        masterProductId,
        colorIds: [selectedColorId],
        gender: selectedGender,
        uom,
        itemsPerPacket: Number(itemsPerPacket) || 1,
        sizes: selectedSizes,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : 'Failed to bulk generate variants.');
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bulk Size Matrix Generator
              </h3>
              <p className="text-xs text-slate-500">
                Generate multiple variant SKUs for <strong className="font-mono text-indigo-700">{masterSku}</strong>
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

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Color & Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Color <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedColorId}
                onChange={(e) => setSelectedColorId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="" disabled>
                  Select Color
                </option>
                {colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.code ? `(${c.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Gender Classification <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value as ProductGender)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="MALE">MALE</option>
                <option value="LADY">LADY</option>
                <option value="KIDS">KIDS</option>
                <option value="JUNIOR">JUNIOR</option>
                <option value="TWIN_JUNIOR">TWIN JUNIOR</option>
              </select>
            </div>
          </div>

          {/* UOM & Packing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Unit of Measurement
              </label>
              <select
                value={uom}
                onChange={(e) => setUom(e.target.value as UnitOfMeasurement)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="PAIR">PAIR</option>
                <option value="LEFT">LEFT</option>
                <option value="RIGHT">RIGHT</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Items Per Packet
              </label>
              <input
                type="number"
                min="1"
                value={itemsPerPacket}
                onChange={(e) => setItemsPerPacket(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Size Range Matrix Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Select Sizes to Generate ({selectedSizes.length} selected)
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllPresets}
                  className="text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  Select All (36-46)
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleClearSizes}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-6 gap-2">
              {COMMON_SIZES.map((size) => {
                const isSelected = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={`flex items-center justify-center rounded-xl py-2 text-xs font-bold transition cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {/* Custom Size Adder */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={customSizeInput}
                onChange={(e) => setCustomSizeInput(e.target.value)}
                placeholder="Custom size (e.g. 47, XL, 38.5)..."
                className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddCustomSize}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Generated SKUs Preview */}
            {selectedColorId && selectedSizes.length > 0 && (
              <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-indigo-900">
                    Auto-Generated SKUs Preview ({selectedSizes.length}):
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {selectedSizes.map((sz) => {
                    const colorName = colors.find((c) => c.id === selectedColorId)?.name || 'CLR';
                    const previewSku = generateVariantSku(masterSku, colorName, selectedGender, sz);
                    return (
                      <span
                        key={sz}
                        className="font-mono text-[10px] bg-white border border-indigo-200 px-2 py-0.5 rounded-md text-indigo-700 font-bold shadow-2xs"
                      >
                        {previewSku}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedColorId || selectedSizes.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  <span>Generate {selectedSizes.length} Variants</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
