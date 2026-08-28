'use client';

import React, { useState, useEffect } from 'react';
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
import { Drawer } from '@/components/common/drawer';
import { Loader2, Package, Edit3, AlertCircle, RefreshCw } from 'lucide-react';

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
        categoryId: '',
        subCategoryId: '',
        materialId: '',
        description: '',
      });
      setIsSkuCustomized(false);
    }
    setErrorMsg('');
  }, [productToEdit, isOpen]);

  const handleGenerateSku = () => {
    const selectedCategory = categories.find((c) => c.id === formData.categoryId);
    const selectedSubCategory = subCategories.find((s) => s.id === formData.subCategoryId);

    const generated = generateMasterProductSku(
      formData.name,
      selectedCategory?.name,
      selectedSubCategory?.name,
    );

    setFormData((prev) => ({ ...prev, sku: generated }));
    setIsSkuCustomized(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (productToEdit) {
        await api.patch(`/master-products/${productToEdit.id}`, formData);
        onSuccess(productToEdit.id);
      } else {
        const res = await api.post('/master-products', formData);
        const newId = res.data?.data?.id || res.data?.id;
        onSuccess(newId);
      }
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : 'Failed to save master product.');
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      icon={productToEdit ? <Edit3 className="h-5 w-5" /> : <Package className="h-5 w-5" />}
      title={productToEdit ? 'Edit Master Product' : 'Create Master Product'}
      description={
        productToEdit
          ? `Updating ${productToEdit.sku}`
          : 'Register a base product archetype for generating variants'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" id="master-product-drawer-form">
        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Product Name */}
        <div>
          <label htmlFor="mp-name" className="mb-1 block text-xs font-semibold text-slate-700">
            Master Product Name <span className="text-red-500">*</span>
          </label>
          <input
            id="mp-name"
            type="text"
            required
            aria-required="true"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Leather Oxford Classic"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
          />
        </div>

        {/* Category & Subcategory Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="mp-category" className="mb-1 block text-xs font-semibold text-slate-700">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="mp-category"
              required
              aria-required="true"
              value={formData.categoryId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  categoryId: e.target.value,
                  subCategoryId: '',
                })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            >
              <option value="" disabled>Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="mp-subcategory" className="mb-1 block text-xs font-semibold text-slate-700">
              Subcategory <span className="text-red-500">*</span>
            </label>
            <select
              id="mp-subcategory"
              required
              aria-required="true"
              value={formData.subCategoryId}
              onChange={(e) => setFormData({ ...formData, subCategoryId: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
            >
              <option value="" disabled>Select Subcategory</option>
              {filteredSubCategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Material */}
        <div>
          <label htmlFor="mp-material" className="mb-1 block text-xs font-semibold text-slate-700">
            Material <span className="text-red-500">*</span>
          </label>
          <select
            id="mp-material"
            required
            aria-required="true"
            value={formData.materialId}
            onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px]"
          >
            <option value="" disabled>Select Material</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* SKU Field with Generator */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="mp-sku" className="block text-xs font-semibold text-slate-700">
              Master SKU <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleGenerateSku}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Auto-Generate</span>
            </button>
          </div>
          <input
            id="mp-sku"
            type="text"
            required
            aria-required="true"
            value={formData.sku}
            onChange={(e) => {
              setFormData({ ...formData, sku: e.target.value.toUpperCase() });
              setIsSkuCustomized(true);
            }}
            placeholder="e.g. SHO-OXF-LEA-001"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 min-h-[40px] font-mono uppercase"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="mp-description" className="mb-1 block text-xs font-semibold text-slate-700">
            Catalog Notes & Specs
          </label>
          <textarea
            id="mp-description"
            rows={3}
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="e.g. Full-grain calfskin leather upper with Goodyear welted rubber sole"
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
            <span>{productToEdit ? 'Save Changes' : 'Create Master Product'}</span>
          </button>
        </div>
      </form>
    </Drawer>
  );
}
