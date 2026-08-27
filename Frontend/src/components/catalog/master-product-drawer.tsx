'use client';

import { useState, useEffect } from 'react';
import {
  MasterProduct,
  CreateMasterProductDTO,
  Category,
  SubCategory,
  Material,
} from '@/types/catalog';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { generateMasterProductSku } from '@/lib/sku-generator';
import { X, Loader2, Package, Edit3, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';

interface MasterProductDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdId?: string) => void;
  productToEdit?: MasterProduct | null;
}

export function MasterProductDrawer({
  isOpen,
  onClose,
  onSuccess,
  productToEdit,
}: MasterProductDrawerProps) {
  const [formData, setFormData] = useState<CreateMasterProductDTO>({
    name: '',
    sku: '',
    categoryId: '',
    subCategoryId: '',
    materialId: '',
    description: '',
  });

  const [isSkuCustomized, setIsSkuCustomized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories-dropdown'],
    queryFn: async () => {
      const res = await api.get('/attributes/categories', { params: { per_page: 100 } });
      return res.data?.data;
    },
    enabled: isOpen,
  });

  // Fetch SubCategories
  const { data: subCategoriesData } = useQuery({
    queryKey: ['subcategories-dropdown'],
    queryFn: async () => {
      const res = await api.get('/attributes/subcategories', { params: { per_page: 100 } });
      return res.data?.data;
    },
    enabled: isOpen,
  });

  // Fetch Materials
  const { data: materialsData } = useQuery({
    queryKey: ['materials-dropdown'],
    queryFn: async () => {
      const res = await api.get('/attributes/materials', { params: { per_page: 100 } });
      return res.data?.data;
    },
    enabled: isOpen,
  });

  const categories: Category[] = Array.isArray(categoriesData?.data)
    ? categoriesData.data
    : Array.isArray(categoriesData)
    ? categoriesData
    : [];

  const subCategories: SubCategory[] = Array.isArray(subCategoriesData?.data)
    ? subCategoriesData.data
    : Array.isArray(subCategoriesData)
    ? subCategoriesData
    : [];

  const materials: Material[] = Array.isArray(materialsData?.data)
    ? materialsData.data
    : Array.isArray(materialsData)
    ? materialsData
    : [];

  // Filter Subcategories by Category
  const filteredSubCategories = formData.categoryId
    ? subCategories.filter((s) => s.categoryId === formData.categoryId)
    : subCategories;

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        name: productToEdit.name,
        sku: productToEdit.sku,
        categoryId: productToEdit.categoryId || '',
        subCategoryId: productToEdit.subCategoryId || '',
        materialId: productToEdit.materialId || '',
        description: productToEdit.description || '',
      });
      setIsSkuCustomized(true);
    } else {
      setFormData({
        name: '',
        sku: '',
        categoryId: categories[0]?.id || '',
        subCategoryId: '',
        materialId: materials[0]?.id || '',
        description: '',
      });
      setIsSkuCustomized(false);
    }
    setErrorMsg('');
  }, [productToEdit, isOpen]);

  // Handle live Auto-SKU generation
  const handleFormChange = (updatedFields: Partial<typeof formData>) => {
    const nextForm = { ...formData, ...updatedFields };
    
    if (!isSkuCustomized && (updatedFields.name || updatedFields.categoryId || updatedFields.subCategoryId)) {
      const catName = categories.find((c) => c.id === nextForm.categoryId)?.name;
      const subCatName = subCategories.find((s) => s.id === nextForm.subCategoryId)?.name;
      const autoSku = generateMasterProductSku(nextForm.name, catName, subCatName);
      nextForm.sku = autoSku;
    }

    setFormData(nextForm);
  };

  const regenerateSku = () => {
    const catName = categories.find((c) => c.id === formData.categoryId)?.name;
    const subCatName = subCategories.find((s) => s.id === formData.subCategoryId)?.name;
    const autoSku = generateMasterProductSku(formData.name, catName, subCatName);
    setFormData((prev) => ({ ...prev, sku: autoSku }));
    setIsSkuCustomized(false);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        ...formData,
        subCategoryId: formData.subCategoryId || undefined,
        materialId: formData.materialId || undefined,
      };

      if (productToEdit) {
        await api.patch(`/master-products/${productToEdit.id}`, payload);
        onSuccess(productToEdit.id);
      } else {
        const res = await api.post('/master-products', payload);
        const newId = res.data?.data?.id || res.data?.id;
        onSuccess(newId);
      }
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : 'Failed to save Master Product.');
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
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                {productToEdit ? (
                  <Edit3 className="h-5 w-5" />
                ) : (
                  <Package className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {productToEdit ? 'Edit Master Product' : 'New Master Product'}
                </h3>
                <p className="text-xs text-slate-500">
                  {productToEdit ? `Updating ${productToEdit.sku}` : 'Define parent catalog product'}
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
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleFormChange({ name: e.target.value })}
                placeholder="e.g. Classic Sport Sneaker"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Master SKU Prefix <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {!isSkuCustomized ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                      <Sparkles className="h-2.5 w-2.5" />
                      Auto-Generated
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={regenerateSku}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                      Auto-Generate
                    </button>
                  )}
                </div>
              </div>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => {
                  setFormData({ ...formData, sku: e.target.value.toUpperCase() });
                  setIsSkuCustomized(true);
                }}
                placeholder="e.g. FTW-RUN-CSS-26"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 font-mono font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                System auto-generates format: [Category]-[SubCat]-[Name]-[Year]. You can edit manually anytime.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => handleFormChange({ categoryId: e.target.value, subCategoryId: '' })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="" disabled>
                  Select Category
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Sub-Category
                </label>
                <select
                  value={formData.subCategoryId || ''}
                  onChange={(e) => handleFormChange({ subCategoryId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">None</option>
                  {filteredSubCategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Primary Material
                </label>
                <select
                  value={formData.materialId || ''}
                  onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">None</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Description / Specifications
              </label>
              <textarea
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product design notes, sole composition, packaging guidelines..."
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
              disabled={isLoading || !formData.name || !formData.sku || !formData.categoryId}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{productToEdit ? 'Save Changes' : 'Create Master Product'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
