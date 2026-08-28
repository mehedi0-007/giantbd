'use client';

import React, { useState } from 'react';
import { Color, ProductGender, UnitOfMeasurement } from '@/types/catalog';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/common/modal';
import { Loader2, Wand2, AlertCircle, Plus, Check } from 'lucide-react';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<Wand2 className="h-5 w-5" />}
      title="Create Variant Products"
      description={
        <>
          Generate matrix SKUs for <strong className="font-mono text-blue-700">{masterSku}</strong>
        </>
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" id="bulk-variant-form">
        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Color Selection */}
        <div>
          <label htmlFor="bvm-color" className="mb-1 block text-xs font-semibold text-slate-700">
            Select Color <span className="text-red-500">*</span>
          </label>
          <select
            id="bvm-color"
            required
            aria-required="true"
            value={selectedColorId}
            onChange={(e) => setSelectedColorId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
          >
            <option value="" disabled>Select Color Option</option>
            {colors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.code ? `(${c.code})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Gender & UOM Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="bvm-gender" className="mb-1 block text-xs font-semibold text-slate-700">
              Target Gender <span className="text-red-500">*</span>
            </label>
            <select
              id="bvm-gender"
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value as ProductGender)}
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
            <label htmlFor="bvm-uom" className="mb-1 block text-xs font-semibold text-slate-700">
              Unit of Measure <span className="text-red-500">*</span>
            </label>
            <select
              id="bvm-uom"
              value={uom}
              onChange={(e) => setUom(e.target.value as UnitOfMeasurement)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            >
              <option value="PAIR">Pair</option>
              <option value="LEFT">Left Only</option>
              <option value="RIGHT">Right Only</option>
            </select>
          </div>

          <div>
            <label htmlFor="bvm-packet" className="mb-1 block text-xs font-semibold text-slate-700">
              Items per Polybag
            </label>
            <input
              id="bvm-packet"
              type="number"
              min={1}
              value={itemsPerPacket}
              onChange={(e) => setItemsPerPacket(Number(e.target.value) || 1)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            />
          </div>
        </div>

        {/* Size Selection Grid */}
        <fieldset className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
          <legend className="text-xs font-semibold text-slate-700 px-1">
            Sizes to Generate ({selectedSizes.length} selected)
          </legend>
          <div className="flex flex-wrap gap-2 mt-2">
            {COMMON_SIZES.map((size) => {
              const isSelected = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition cursor-pointer min-h-[36px] ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                  <span>EU {size}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Size Input */}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={customSizeInput}
              onChange={(e) => setCustomSizeInput(e.target.value)}
              placeholder="Custom size (e.g. 47 or XL)"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden min-h-[36px]"
            />
            <button
              type="button"
              onClick={handleAddCustomSize}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer min-h-[36px]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          </div>
        </fieldset>

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
            <span>Generate {selectedSizes.length} Variants</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
