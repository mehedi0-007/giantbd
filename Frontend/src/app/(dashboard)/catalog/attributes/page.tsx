'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Category, SubCategory, Color, Material } from '@/types/catalog';
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Palette,
  Layers,
  FolderTree,
  Shield,
  Loader2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';

type TabType = 'categories' | 'subcategories' | 'colors' | 'materials';

export default function AttributesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('categories');

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [colorCode, setColorCode] = useState('#2563eb');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Queries
  const { data: categoriesData, isLoading: loadingCat } = useQuery({
    queryKey: ['attributes-categories'],
    queryFn: async () => {
      const res = await api.get('/attributes/categories', { params: { per_page: 100 } });
      return res.data?.data;
    },
  });

  const { data: subCategoriesData, isLoading: loadingSub } = useQuery({
    queryKey: ['attributes-subcategories'],
    queryFn: async () => {
      const res = await api.get('/attributes/subcategories', { params: { per_page: 100 } });
      return res.data?.data;
    },
  });

  const { data: colorsData, isLoading: loadingCol } = useQuery({
    queryKey: ['attributes-colors'],
    queryFn: async () => {
      const res = await api.get('/attributes/colors', { params: { per_page: 100 } });
      return res.data?.data;
    },
  });

  const { data: materialsData, isLoading: loadingMat } = useQuery({
    queryKey: ['attributes-materials'],
    queryFn: async () => {
      const res = await api.get('/attributes/materials', { params: { per_page: 100 } });
      return res.data?.data;
    },
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

  const colors: Color[] = Array.isArray(colorsData?.data)
    ? colorsData.data
    : Array.isArray(colorsData)
    ? colorsData
    : [];

  const materials: Material[] = Array.isArray(materialsData?.data)
    ? materialsData.data
    : Array.isArray(materialsData)
    ? materialsData
    : [];

  // Open Modal Helpers
  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setColorCode('#2563eb');
    setSelectedCategoryId(categories[0]?.id || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setName(item.name);
    setColorCode(item.code || '#2563eb');
    setSelectedCategoryId(item.categoryId || categories[0]?.id || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    setErrorMsg('');

    try {
      let endpoint = '';
      let payload: any = { name: name.trim() };

      if (activeTab === 'categories') {
        endpoint = '/attributes/categories';
      } else if (activeTab === 'subcategories') {
        endpoint = '/attributes/subcategories';
        payload.categoryId = selectedCategoryId;
      } else if (activeTab === 'colors') {
        endpoint = '/attributes/colors';
        payload.code = colorCode;
      } else if (activeTab === 'materials') {
        endpoint = '/attributes/materials';
      }

      if (editingItem) {
        await api.patch(`${endpoint}/${editingItem.id}`, payload);
      } else {
        await api.post(endpoint, payload);
      }

      queryClient.invalidateQueries({ queryKey: [`attributes-${activeTab}`] });
      queryClient.invalidateQueries({ queryKey: ['categories-dropdown'] });
      queryClient.invalidateQueries({ queryKey: ['colors-dropdown'] });
      queryClient.invalidateQueries({ queryKey: ['materials-dropdown'] });
      setIsModalOpen(false);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Failed to save attribute record.';
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Handler
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      let endpoint = '';
      if (activeTab === 'categories') endpoint = '/attributes/categories';
      else if (activeTab === 'subcategories') endpoint = '/attributes/subcategories';
      else if (activeTab === 'colors') endpoint = '/attributes/colors';
      else if (activeTab === 'materials') endpoint = '/attributes/materials';

      await api.delete(`${endpoint}/${id}`);
      queryClient.invalidateQueries({ queryKey: [`attributes-${activeTab}`] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete attribute.');
    }
  };

  // Restore Handler
  const handleRestore = async (id: string) => {
    try {
      let endpoint = '';
      if (activeTab === 'categories') endpoint = '/attributes/categories';
      else if (activeTab === 'subcategories') endpoint = '/attributes/subcategories';
      else if (activeTab === 'colors') endpoint = '/attributes/colors';
      else if (activeTab === 'materials') endpoint = '/attributes/materials';

      await api.post(`${endpoint}/${id}/restore`);
      queryClient.invalidateQueries({ queryKey: [`attributes-${activeTab}`] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to restore attribute.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Master Attributes Manager
            </h1>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              Taxonomy & Variants
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure product categories, subcategories, color swatches, and material types
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add {activeTab.slice(0, -1)}</span>
        </button>
      </div>

      {/* 4 Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer ${
            activeTab === 'categories'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FolderTree className="h-4 w-4" />
          <span>Categories ({categories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subcategories')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer ${
            activeTab === 'subcategories'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Sub-Categories ({subCategories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('colors')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer ${
            activeTab === 'colors'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Palette className="h-4 w-4" />
          <span>Colors ({colors.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('materials')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer ${
            activeTab === 'materials'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Materials ({materials.length})</span>
        </button>
      </div>

      {/* Tab Content Tables */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {/* 1. CATEGORIES */}
        {activeTab === 'categories' && (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Category Name</th>
                <th className="px-6 py-3.5">Sub-Categories Count</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {categories.map((c) => {
                const isDel = c.status === 'DELETED';
                return (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-bold text-slate-900">{c.name}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {c._count?.subCategories || c.subCategories?.length || 0} items
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isDel
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isDel ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id, c.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRestore(c.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Restore</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* 2. SUB-CATEGORIES */}
        {activeTab === 'subcategories' && (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Sub-Category Name</th>
                <th className="px-6 py-3.5">Parent Category</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {subCategories.map((s) => {
                const isDel = s.status === 'DELETED';
                return (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700 font-semibold">
                        {s.category?.name || 'Category'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isDel
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isDel ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(s.id, s.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRestore(s.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Restore</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* 3. COLORS */}
        {activeTab === 'colors' && (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Color Name</th>
                <th className="px-6 py-3.5">HEX Code & Swatch</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {colors.map((c) => {
                const isDel = c.status === 'DELETED';
                return (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-bold text-slate-900">{c.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-5 w-5 rounded-full border border-slate-300 shadow-xs"
                          style={{ backgroundColor: c.code || '#cccccc' }}
                        />
                        <span className="font-mono text-slate-600">{c.code || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isDel
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isDel ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id, c.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRestore(c.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Restore</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* 4. MATERIALS */}
        {activeTab === 'materials' && (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Material Name</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {materials.map((m) => {
                const isDel = m.status === 'DELETED';
                return (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-bold text-slate-900">{m.name}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isDel
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isDel ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(m)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(m.id, m.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRestore(m.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Restore</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Attribute Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingItem ? `Edit ${activeTab.slice(0, -1)}` : `New ${activeTab.slice(0, -1)}`}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'subcategories' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Parent Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`e.g. ${
                    activeTab === 'categories'
                      ? 'Footwear'
                      : activeTab === 'colors'
                      ? 'Navy Blue'
                      : activeTab === 'materials'
                      ? 'Synthetic Leather'
                      : 'Running Shoes'
                  }`}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {activeTab === 'colors' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Color Swatch / HEX Code
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={colorCode}
                      onChange={(e) => setColorCode(e.target.value)}
                      className="h-9 w-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={colorCode}
                      onChange={(e) => setColorCode(e.target.value)}
                      placeholder="#2563eb"
                      className="flex-1 font-mono uppercase rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !name.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save {activeTab.slice(0, -1)}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
