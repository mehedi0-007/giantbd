'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { MasterProduct, Category, Material } from '@/types/catalog';
import { MasterProductDrawer } from '@/components/catalog/master-product-drawer';
import { DataPagination, ConfirmDialog, TableSkeleton, EmptyState } from '@/components/common';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  ArrowRight,
  Loader2,
  Boxes,
} from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MasterProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<MasterProduct | null>(null);

  // Fetch Categories for Filter
  const { data: categoriesData } = useQuery({
    queryKey: ['categories-filter'],
    queryFn: async () => {
      const res = await api.get('/attributes/categories', { params: { per_page: 100 } });
      return res.data?.data;
    },
  });

  // Fetch Materials for Filter
  const { data: materialsData } = useQuery({
    queryKey: ['materials-filter'],
    queryFn: async () => {
      const res = await api.get('/attributes/materials', { params: { per_page: 100 } });
      return res.data?.data;
    },
  });

  // Fetch Master Products List
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['master-products', page, pageSize, search, categoryFilter, materialFilter],
    queryFn: async () => {
      const res = await api.get('/master-products', {
        params: {
          page,
          per_page: pageSize,
          search: search.trim() || undefined,
          categoryId: categoryFilter || undefined,
          materialId: materialFilter || undefined,
        },
      });
      return res.data?.data;
    },
  });

  // Soft-Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/master-products/${id}`);
    },
    onSuccess: () => {
      toast.success('Master product deactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['master-products'] });
      setProductToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to deactivate product');
    },
  });

  // Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/master-products/${id}/restore`);
    },
    onSuccess: () => {
      toast.success('Master product restored successfully');
      queryClient.invalidateQueries({ queryKey: ['master-products'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to restore product');
    },
  });

  const categories: Category[] = Array.isArray(categoriesData?.data)
    ? categoriesData.data
    : Array.isArray(categoriesData)
    ? categoriesData
    : [];

  const materials: Material[] = Array.isArray(materialsData?.data)
    ? materialsData.data
    : Array.isArray(materialsData)
    ? materialsData
    : [];

  const products: MasterProduct[] = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
    ? data
    : [];

  const totalPages = data?.total_page || 1;
  const totalCount = data?.total || products.length;

  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (p: MasterProduct) => {
    setSelectedProduct(p);
    setIsDrawerOpen(true);
  };

  const handleSuccess = (createdId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['master-products'] });
    if (createdId && !selectedProduct) {
      router.push(`/catalog/products/${createdId}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Master Product Catalog
            </h1>
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              {totalCount} Master SKUs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage parent catalog styles, categories, materials, and generate size matrices
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Master Product</span>
        </button>
      </div>

      {/* Filter & View Mode Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by product name or SKU prefix..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={materialFilter}
            onChange={(e) => {
              setMaterialFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="">All Materials</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {isFetching && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area: List View */}
      {isLoading ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <TableSkeleton
            rows={6}
            columns={['26%', '14%', '15%', '15%', '14%', '8%', '8%']}
          />
        </div>
      ) : products.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <EmptyState
            icon={<Package className="h-7 w-7 text-indigo-600" />}
            title={search || categoryFilter || materialFilter ? 'No matching products found' : 'No master products yet'}
            description={
              search || categoryFilter || materialFilter
                ? 'No master products match your active filters. Try adjusting your search term, category, or material.'
                : 'Add your first master product to create styles and size variants.'
            }
            action={
              search || categoryFilter || materialFilter
                ? {
                    label: 'Reset Filters',
                    onClick: () => {
                      setSearch('');
                      setCategoryFilter('');
                      setMaterialFilter('');
                      setPage(1);
                    },
                    variant: 'secondary',
                  }
                : {
                    label: 'Add Master Product',
                    onClick: handleOpenCreate,
                    icon: <Plus className="h-3.5 w-3.5" />,
                  }
            }
          />
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Master Product Name</th>
                  <th className="px-5 py-3.5">Material</th>
                  <th className="px-5 py-3.5">SKU</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Sub Category</th>
                  <th className="px-5 py-3.5">Variants count</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {products.map((p) => {
                  const isDeleted = p.status === 'DELETED';
                  const variantCount = p._count?.variantProducts || p.variantProducts?.length || 0;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isDeleted ? 'bg-slate-50/40 opacity-70' : ''
                      }`}
                    >
                      {/* Master Product Name */}
                      <td className="px-5 py-4">
                        <NextLink
                          href={`/catalog/products/${p.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 transition block text-sm"
                        >
                          {p.name}
                        </NextLink>
                        {p.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-xs">
                            {p.description}
                          </p>
                        )}
                      </td>

                      {/* Material */}
                      <td className="px-5 py-4 font-medium">
                        {p.material ? (
                          <span className="rounded-md bg-amber-50 border border-amber-200/60 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            {p.material.name}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* SKU */}
                      <td className="px-5 py-4">
                        <span className="font-mono font-bold text-xs rounded-md bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 text-indigo-700">
                          {p.sku}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {p.category?.name || '—'}
                      </td>

                      {/* Sub Category */}
                      <td className="px-5 py-4 text-slate-600 font-medium">
                        {p.subCategory?.name || '—'}
                      </td>

                      {/* Variants count */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-200/60 px-2.5 py-1 text-xs font-bold text-blue-700">
                          <Boxes className="h-3.5 w-3.5 text-blue-500" />
                          <span>{variantCount} Variants</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <NextLink
                            href={`/catalog/products/${p.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                          >
                            <span>Variants</span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                          </NextLink>

                          {!isDeleted ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(p)}
                                title="Edit Product"
                                aria-label={`Edit product ${p.name}`}
                                className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setProductToDelete(p)}
                                title="Deactivate Product"
                                aria-label={`Deactivate product ${p.name}`}
                                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => restoreMutation.mutate(p.id)}
                              title="Restore"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition cursor-pointer min-h-[36px]"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Restore</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Unified Pagination Toolbar */}
          <DataPagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => setPageSize(s)}
            pageSizeOptions={[10, 20, 50, 100]}
          />
        </div>
      )}

      {/* Slide-over Create/Edit Drawer */}
      <MasterProductDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={handleSuccess}
        productToEdit={selectedProduct}
      />

      {/* Accessible Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={async () => {
          if (productToDelete) {
            await deleteMutation.mutateAsync(productToDelete.id);
          }
        }}
        title="Deactivate Master Product"
        description={
          <>
            Are you sure you want to deactivate master product <strong className="text-slate-900">{productToDelete?.name}</strong> ({productToDelete?.sku})?
            Its variant products will be preserved in archived status.
          </>
        }
        confirmText="Deactivate Product"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
