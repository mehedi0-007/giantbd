'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { MasterProduct, Color, ProductGender } from '@/types/catalog';
import { PO } from '@/types/commercial';
import { StorageLocation } from '@/types/warehouse';
import { BatchLabelModal } from '@/components/inventory/batch-label-modal';
import { formatNumber } from '@/lib/utils';
import {
  ArrowDownToLine,
  Package,
  Layers,
  FileText,
  Upload,
  Printer,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Boxes,
} from 'lucide-react';

interface SizeRow {
  variantProductId?: string;
  size: string;
  sku?: string;
  receivedQty: number;
  itemsPerPacket: number;
  locationId: string;
}

export default function StockInPage() {
  const queryClient = useQueryClient();

  // Wizard Step (1: Info, 2: Matrix, 3: Review)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 Form States
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedColorId, setSelectedColorId] = useState('');
  const [selectedGender, setSelectedGender] = useState<ProductGender>('MALE');
  const [productionDate, setProductionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [expirationDate, setExpirationDate] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [selectedPoId, setSelectedPoId] = useState('');
  const [note, setNote] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  // Step 2 Form States (Dynamic Grid)
  const [sizeRows, setSizeRows] = useState<SizeRow[]>([]);
  const [globalLocationId, setGlobalLocationId] = useState('');
  const [customSize, setCustomSize] = useState('');

  // Submit & Modal States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [completedBatch, setCompletedBatch] = useState<any | null>(null);

  // 1. Fetch Master Products
  const { data: productsData } = useQuery({
    queryKey: ['master-products-stockin'],
    queryFn: async () => {
      const res = await api.get('/master-products', { params: { per_page: 100 } });
      return res.data?.data;
    },
  });

  // 2. Fetch Colors
  const { data: colorsData } = useQuery({
    queryKey: ['colors-stockin'],
    queryFn: async () => {
      const res = await api.get('/attributes/colors', { params: { per_page: 100 } });
      return res.data?.data;
    },
  });

  // 3. Fetch Purchase Orders
  const { data: posData } = useQuery({
    queryKey: ['pos-stockin'],
    queryFn: async () => {
      const res = await api.get('/po', { params: { per_page: 100 } });
      return res.data?.data;
    },
  });

  // 4. Fetch Storage Locations
  const { data: locationsData } = useQuery({
    queryKey: ['locations-stockin'],
    queryFn: async () => {
      const res = await api.get('/attributes/locations', { params: { per_page: 200 } });
      return res.data?.data;
    },
  });

  const products: MasterProduct[] = Array.isArray(productsData?.data) ? productsData.data : Array.isArray(productsData) ? productsData : [];
  const colors: Color[] = Array.isArray(colorsData?.data) ? colorsData.data : Array.isArray(colorsData) ? colorsData : [];
  const pos: PO[] = Array.isArray(posData?.data) ? posData.data : Array.isArray(posData) ? posData : [];
  const locations: StorageLocation[] = Array.isArray(locationsData?.data) ? locationsData.data : Array.isArray(locationsData) ? locationsData : [];

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedColor = colors.find((c) => c.id === selectedColorId);

  // Transition Step 1 ➔ Step 2: Auto-load existing variants for this Product+Color+Gender
  const handleProceedToMatrix = async () => {
    if (!selectedProductId || !selectedColorId || !productionDate) {
      setErrorMsg('Please select a Product, Color, and Production Date.');
      return;
    }

    setErrorMsg('');
    try {
      const res = await api.get('/inventory/stock-in/preview', {
        params: {
          masterProductId: selectedProductId,
          colorId: selectedColorId,
          gender: selectedGender,
        },
      });

      const previewVariants = res.data?.data?.variants || res.data?.data || [];
      const defaultLoc = locations[0]?.id || '';
      setGlobalLocationId(defaultLoc);

      if (previewVariants.length > 0) {
        const rows: SizeRow[] = previewVariants.map((v: any) => ({
          variantProductId: v.id,
          size: v.size,
          sku: v.sku,
          receivedQty: 0,
          itemsPerPacket: v.itemsPerPacket || 1,
          locationId: defaultLoc,
        }));
        setSizeRows(rows);
      } else {
        // Default standard size range if none created yet
        const defaultSizes = ['38', '39', '40', '41', '42', '43', '44'];
        const rows: SizeRow[] = defaultSizes.map((s) => ({
          size: s,
          receivedQty: 0,
          itemsPerPacket: 1,
          locationId: defaultLoc,
        }));
        setSizeRows(rows);
      }

      setStep(2);
    } catch {
      // Fallback
      const defaultSizes = ['38', '39', '40', '41', '42', '43', '44'];
      const defaultLoc = locations[0]?.id || '';
      setSizeRows(
        defaultSizes.map((s) => ({
          size: s,
          receivedQty: 0,
          itemsPerPacket: 1,
          locationId: defaultLoc,
        })),
      );
      setStep(2);
    }
  };

  // Add Custom Size Row
  const handleAddCustomSizeRow = () => {
    const s = customSize.trim();
    if (!s) return;
    if (sizeRows.some((r) => r.size === s)) {
      setErrorMsg(`Size ${s} is already in the matrix.`);
      return;
    }

    setSizeRows([
      ...sizeRows,
      {
        size: s,
        receivedQty: 0,
        itemsPerPacket: 1,
        locationId: globalLocationId || locations[0]?.id || '',
      },
    ]);
    setCustomSize('');
    setErrorMsg('');
  };

  // Apply Global Location to All Rows
  const handleApplyLocationToAll = (locId: string) => {
    setGlobalLocationId(locId);
    setSizeRows(sizeRows.map((r) => ({ ...r, locationId: locId })));
  };

  // Update specific row
  const updateRow = (index: number, fields: Partial<SizeRow>) => {
    const updated = [...sizeRows];
    updated[index] = { ...updated[index], ...fields };
    setSizeRows(updated);
  };

  // Total Quantity Calculation
  const totalReceivedPairs = sizeRows.reduce(
    (sum, r) => sum + (Number(r.receivedQty) || 0),
    0,
  );

  // Transition Step 2 ➔ Step 3
  const handleProceedToReview = () => {
    if (totalReceivedPairs <= 0) {
      setErrorMsg('Please enter a received quantity of at least 1 pair across sizes.');
      return;
    }
    const hasMissingLoc = sizeRows.some(
      (r) => r.receivedQty > 0 && !r.locationId,
    );
    if (hasMissingLoc) {
      setErrorMsg('All received sizes must have a target destination bin location.');
      return;
    }

    setErrorMsg('');
    setStep(3);
  };

  // Step 3: Execute Stock-In Submission
  const handleExecuteStockIn = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const activeItems = sizeRows
        .filter((r) => Number(r.receivedQty) > 0)
        .map((r) => ({
          variantProductId: r.variantProductId || undefined,
          size: r.size,
          receivedQty: Number(r.receivedQty),
          itemsPerPacket: Number(r.itemsPerPacket) || 1,
          locationId: r.locationId,
        }));

      const formData = new FormData();
      formData.append('masterProductId', selectedProductId);
      formData.append('colorId', selectedColorId);
      formData.append('gender', selectedGender);
      formData.append('productionDate', new Date(productionDate).toISOString());
      if (expirationDate) {
        formData.append('expirationDate', new Date(expirationDate).toISOString());
      }
      if (batchNumber) formData.append('batch_number', batchNumber);
      if (selectedPoId) formData.append('poId', selectedPoId);
      if (note) formData.append('note', note);
      if (globalLocationId) formData.append('defaultLocationId', globalLocationId);

      formData.append('items', JSON.stringify(activeItems));

      if (invoiceFile) {
        formData.append('document', invoiceFile);
      }

      const res = await api.post('/inventory/stock-in', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const batch = res.data?.data?.batch || res.data?.data;

      // Prepare Batch Label Print Data
      setCompletedBatch({
        batchId: batch?.batch_id || `BAT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        batchNumber: batch?.batch_number || batchNumber,
        productName: selectedProduct?.name || 'Master Product',
        colorName: selectedColor?.name || 'Color',
        gender: selectedGender,
        productionDate,
        expirationDate: expirationDate || undefined,
        totalPairs: totalReceivedPairs,
      });

      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
      queryClient.invalidateQueries({ queryKey: ['live-stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-outs'] });
      queryClient.invalidateQueries({ queryKey: ['available-batches-for-dispatch'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['locations-table'] });
      queryClient.invalidateQueries({ queryKey: ['master-product-detail'] });

      // Reset wizard
      setStep(1);
      setSelectedProductId('');
      setSelectedColorId('');
      setInvoiceFile(null);
      setSizeRows([]);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : 'Failed to execute stock-in.');
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Goods Receipt (Stock-In Wizard)
            </h1>
            <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              Inward Lot Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Receive incoming goods, auto-resolve sizes, assign bin addresses, and generate batch stickers
          </p>
        </div>
      </div>

      {/* 3-Step Wizard Indicator */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
            step === 1
              ? 'border-blue-600 bg-blue-50/60 shadow-xs'
              : step > 1
              ? 'border-emerald-300 bg-emerald-50/40'
              : 'border-slate-200 bg-white opacity-60'
          }`}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold text-xs ${
              step === 1
                ? 'bg-blue-600 text-white'
                : step > 1
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : '1'}
          </div>
          <div>
            <div className="font-bold text-xs text-slate-900">1. Batch & Header</div>
            <div className="text-[11px] text-slate-500">Product, Color & Invoice</div>
          </div>
        </div>

        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
            step === 2
              ? 'border-blue-600 bg-blue-50/60 shadow-xs'
              : step > 2
              ? 'border-emerald-300 bg-emerald-50/40'
              : 'border-slate-200 bg-white opacity-60'
          }`}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold text-xs ${
              step === 2
                ? 'bg-blue-600 text-white'
                : step > 2
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {step > 2 ? <CheckCircle2 className="h-4 w-4" /> : '2'}
          </div>
          <div>
            <div className="font-bold text-xs text-slate-900">2. Size Matrix</div>
            <div className="text-[11px] text-slate-500">Quantities & Bin Baskets</div>
          </div>
        </div>

        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
            step === 3
              ? 'border-blue-600 bg-blue-50/60 shadow-xs'
              : 'border-slate-200 bg-white opacity-60'
          }`}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold text-xs ${
              step === 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            3
          </div>
          <div>
            <div className="font-bold text-xs text-slate-900">3. Review & Print</div>
            <div className="text-[11px] text-slate-500">Lot Code 128 Sticker</div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: HEADER & INVOICE */}
      {step === 1 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Inward Batch Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Master Product Style <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="" disabled>
                  Select Master Product
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Color Variation <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedColorId}
                onChange={(e) => setSelectedColorId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Gender Classification <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value as ProductGender)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="MALE">MALE</option>
                <option value="LADY">LADY</option>
                <option value="KIDS">KIDS</option>
                <option value="JUNIOR">JUNIOR</option>
                <option value="TWIN_JUNIOR">TWIN JUNIOR</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Production Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Expiration Date
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Lot / Roll Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                placeholder="e.g. LOT-2026-X9"
                className="w-full font-mono rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Linked Purchase Order <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                value={selectedPoId}
                onChange={(e) => setSelectedPoId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">None (Stock Production)</option>
                {pos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.poNumber} — {p.buyer?.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Document Attachment */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Supplier Invoice / Delivery Challan Document
            </label>
            <div className="flex items-center gap-3 border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <Upload className="h-5 w-5 text-slate-400 shrink-0" />
              <div className="flex-1">
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>
              {invoiceFile && (
                <span className="text-xs font-semibold text-emerald-600">
                  {invoiceFile.name}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Receiving Notes / Quality Remarks
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Inspection results, carton conditions, delivery vehicle..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleProceedToMatrix}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
            >
              <span>Next: Size Matrix</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DYNAMIC SIZE MATRIX */}
      {step === 2 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Quantity Matrix per Size
              </h3>
              <p className="text-xs text-slate-500">
                Enter received quantities and select destination bin racks
              </p>
            </div>

            {/* Quick Bulk Location Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 shrink-0">
                Default Bin:
              </span>
              <select
                value={globalLocationId}
                onChange={(e) => handleApplyLocationToAll(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} ({loc.warehouse?.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Matrix Grid Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                <tr>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">SKU Identifier</th>
                  <th className="px-4 py-3 w-36">Received Pairs *</th>
                  <th className="px-4 py-3 w-28">Items / Packet</th>
                  <th className="px-4 py-3">Destination Bin Slot *</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sizeRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 font-bold text-slate-900 text-xs">
                        Size {row.size}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      {row.sku || `${selectedProduct?.sku}-${selectedColor?.name?.slice(0, 3).toUpperCase()}-${row.size}`}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        value={row.receivedQty === 0 ? '' : row.receivedQty}
                        onChange={(e) => updateRow(idx, { receivedQty: Number(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full font-bold text-sm rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900 focus:border-blue-500 focus:outline-hidden"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        value={row.itemsPerPacket}
                        onChange={(e) => updateRow(idx, { itemsPerPacket: Number(e.target.value) || 1 })}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={row.locationId}
                        onChange={(e) => updateRow(idx, { locationId: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.code} ({loc.warehouse?.name} &bull; Rack {loc.rack?.code || 'R'})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Custom Size Line */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              placeholder="Add custom size (e.g. 47)..."
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleAddCustomSizeRow}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Size Row</span>
            </button>
          </div>

          {/* Total Summary Footer */}
          <div className="flex items-center justify-between pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 font-medium">
                  Total To Receive:
                </span>
                <div className="text-lg font-bold text-emerald-700">
                  {formatNumber(totalReceivedPairs)} pairs
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceedToReview}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
              >
                <span>Review & Submit</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & ATOMIC SUBMIT */}
      {step === 3 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">
              Confirm Inward Goods Batch
            </h3>
            <p className="text-xs text-slate-500">
              Review transaction parameters before posting to inventory ledger
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <span className="text-slate-400">Product Style:</span>
              <p className="font-bold text-slate-900 mt-0.5">{selectedProduct?.name}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <span className="text-slate-400">Color & Gender:</span>
              <p className="font-bold text-slate-900 mt-0.5">
                {selectedColor?.name} ({selectedGender})
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <span className="text-slate-400">Production Date:</span>
              <p className="font-bold text-slate-900 mt-0.5">{productionDate}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-emerald-50/50 p-3">
              <span className="text-emerald-700 font-semibold">Total Inward Pairs:</span>
              <p className="font-extrabold text-emerald-800 text-base mt-0.5">
                {formatNumber(totalReceivedPairs)} prs
              </p>
            </div>
          </div>

          {/* Active Items Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500 text-[11px] border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2.5">Size</th>
                  <th className="px-4 py-2.5">Quantity</th>
                  <th className="px-4 py-2.5">Packets</th>
                  <th className="px-4 py-2.5">Destination Storage Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sizeRows
                  .filter((r) => r.receivedQty > 0)
                  .map((r, idx) => {
                    const loc = locations.find((l) => l.id === r.locationId);
                    return (
                      <tr key={idx}>
                        <td className="px-4 py-2.5 font-bold text-slate-900">
                          Size {r.size}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-emerald-700">
                          {formatNumber(r.receivedQty)} pairs
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {Math.ceil(r.receivedQty / (r.itemsPerPacket || 1))} pkts ({r.itemsPerPacket}/pkt)
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-800">
                          {loc?.code} ({loc?.warehouse?.name})
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-between pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Matrix</span>
            </button>

            <button
              type="button"
              onClick={handleExecuteStockIn}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing Inward Batch...</span>
                </>
              ) : (
                <>
                  <ArrowDownToLine className="h-4 w-4" />
                  <span>Execute Stock-In & Print Sticker</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Generated Batch Sticker Modal */}
      <BatchLabelModal
        isOpen={!!completedBatch}
        onClose={() => setCompletedBatch(null)}
        batchData={completedBatch}
      />
    </div>
  );
}
