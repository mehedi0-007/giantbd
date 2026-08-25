'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { MasterProduct, VariantProduct } from '@/types/catalog';
import { BulkVariantModal } from '@/components/catalog/bulk-variant-modal';
import { formatNumber } from '@/lib/utils';
import NextLink from 'next/link';
import {
  Package,
  ArrowLeft,
  Wand2,
  Barcode,
  Layers,
  AlertTriangle,
  Loader2,
  Trash2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedVariantForPic, setSelectedVariantForPic] = useState<VariantProduct | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Fetch Master Product with Variants
  const { data: productData, isLoading } = useQuery({
    queryKey: ['master-product-detail', id],
    queryFn: async () => {
      const res = await api.get(`/master-products/${id}`);
      return res.data?.data;
    },
    enabled: !!id,
  });

  // Soft-Delete Variant Mutation
  const deleteVariantMutation = useMutation({
    mutationFn: async (variantId: string) => {
      await api.delete(`/variants/${variantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-product-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
  });

  const product: MasterProduct | undefined = productData;

  // Handle Image File Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setUploadError('');
    }
  };

  // Upload Picture Mutation
  const handleUploadPicture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantForPic || !selectedImageFile) return;

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('picture', selectedImageFile);

      await api.post(`/variants/${selectedVariantForPic.id}/picture`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      queryClient.invalidateQueries({ queryKey: ['master-product-detail', id] });
      setSelectedVariantForPic(null);
      setSelectedImageFile(null);
      setImagePreview(null);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Failed to upload variant picture.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
        <p className="text-xs font-medium text-slate-500">Loading variant matrix...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500 mb-2" />
        <h3 className="text-base font-bold text-slate-900">Product Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          The requested product style could not be located.
        </p>
        <NextLink
          href="/catalog/products"
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs"
        >
          Back to Catalog
        </NextLink>
      </div>
    );
  }

  const variants: VariantProduct[] = product.variantProducts || [];

  // Compute Total Inventory & Low Stock Items
  let totalShippable = 0;
  let lowStockCount = 0;

  variants.forEach((v) => {
    const qty = v.shippableQuantity || 0;
    totalShippable += qty;
    if (qty < 30) {
      lowStockCount++;
    }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/catalog/products')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                {product.sku}
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {product.name}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Category: <strong className="text-slate-700">{product.category?.name}</strong>
              {product.material && <> • Material: <strong className="text-slate-700">{product.material.name}</strong></>}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsBulkModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer"
        >
          <Wand2 className="h-4 w-4" />
          <span>Generate Size Matrix</span>
        </button>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Active Variants
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {variants.length} <span className="text-sm font-normal text-slate-500">sizes/SKUs</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total In-Hand Stock
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">
            {formatNumber(totalShippable)} <span className="text-sm font-normal text-slate-500">pairs</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Low Stock Alerts (&lt; 30 pairs)
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {lowStockCount}
            </span>
            <span className="text-xs text-slate-500">
              {lowStockCount > 0 ? 'sizes require replenishment' : 'all well-stocked'}
            </span>
          </div>
        </div>
      </div>

      {/* Variant Matrix Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Variant Product Matrix
            </h3>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {variants.length} Records
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <Wand2 className="h-3.5 w-3.5 text-blue-600" />
            <span>Generate Sizes</span>
          </button>
        </div>

        {variants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-10 w-10 text-slate-300 mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No variant SKUs generated yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Use the bulk generator to automatically create sizes 36–45 with color and gender classifications.
            </p>
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>Launch Matrix Generator</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Image</th>
                  <th className="px-5 py-3.5">SKU & Barcode</th>
                  <th className="px-5 py-3.5">Color</th>
                  <th className="px-5 py-3.5">Size & Gender</th>
                  <th className="px-5 py-3.5 text-right">In-Hand Stock</th>
                  <th className="px-5 py-3.5 text-right">Pricing (MRP)</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {variants.map((v) => {
                  const isLow = (v.shippableQuantity || 0) < 30;
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Image Thumbnail */}
                      <td className="px-5 py-3.5">
                        {v.picture ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/${v.picture}`}
                            alt={v.name}
                            className="h-9 w-9 rounded-lg object-cover border border-slate-200 cursor-pointer"
                            onClick={() => setSelectedVariantForPic(v)}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedVariantForPic(v)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition cursor-pointer"
                            title="Upload picture"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </button>
                        )}
                      </td>

                      {/* SKU & Barcode */}
                      <td className="px-5 py-3.5">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {v.sku}
                        </div>
                        {v.barcode && (
                          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 mt-0.5">
                            <Barcode className="h-3 w-3 text-slate-400" />
                            <span>{v.barcode}</span>
                          </div>
                        )}
                      </td>

                      {/* Color */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {v.color?.code && (
                            <span
                              className="h-3 w-3 rounded-full border border-slate-300 shadow-2xs shrink-0"
                              style={{ backgroundColor: v.color.code }}
                            />
                          )}
                          <span className="font-bold text-slate-800">
                            {v.color?.name || 'Color N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Size & Gender */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-800">
                            Size {v.size}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-[11px] text-slate-600 uppercase font-semibold">
                            {v.gender}
                          </span>
                        </div>
                      </td>

                      {/* In-Hand Stock */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <span
                            className={`font-bold text-sm ${
                              isLow ? 'text-amber-600' : 'text-slate-900'
                            }`}
                          >
                            {formatNumber(v.shippableQuantity)}
                          </span>
                          <span className="text-slate-400 text-xs font-normal">prs</span>
                          {isLow && (
                            <span title="Low stock alert (< 30 pairs)">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Pricing */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800">
                            {v.sellingPrice ? `$${v.sellingPrice}` : '—'}
                          </div>
                          {v.mrp && (
                            <div className="text-[10px] text-slate-400">
                              MRP: ${v.mrp}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedVariantForPic(v)}
                            title="Upload Picture"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Upload className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete size ${v.size}?`)) {
                                deleteVariantMutation.mutate(v.id);
                              }
                            }}
                            title="Delete Variant"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Generator Modal */}
      <BulkVariantModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['master-product-detail', id] })}
        masterProductId={product.id}
        masterSku={product.sku}
      />

      {/* Upload Picture Modal */}
      {selectedVariantForPic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setSelectedVariantForPic(null)}
          />

          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Upload Variant Picture
              </h3>
              <button
                type="button"
                onClick={() => setSelectedVariantForPic(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {uploadError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadPicture} className="space-y-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 hover:border-blue-400 transition">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-32 w-32 object-cover rounded-lg mb-2"
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-400 py-4">
                    <ImageIcon className="h-10 w-10 mb-2" />
                    <span className="text-xs">Click to browse image file</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-2 text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedVariantForPic(null)}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedImageFile}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Save Image</span>
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
