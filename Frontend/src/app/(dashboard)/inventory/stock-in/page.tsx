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
  warehouseId: string;
  zoneId: string;
  subZoneId: string;
  rackId: string;
  locationId: string;
}

export default function StockInPage() {
  const queryClient = useQueryClient();

  // Wizard Step (1: Info, 2: Matrix, 3: Review)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 Form States
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedColorId, setSelectedColorId] = useState('');
  const [selectedGender, setSelectedGender] = useState<ProductGender | ''>('');
  const [stockInDate, setStockInDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [productionDate, setProductionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [expirationDate, setExpirationDate] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [selectedPoId, setSelectedPoId] = useState('');
  const [note, setNote] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  // Step 2 Form States (Dynamic Grid & Cascading Location Hierarchy)
  const [sizeRows, setSizeRows] = useState<SizeRow[]>([]);
  const [globalLocationId, setGlobalLocationId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [selectedSubZoneId, setSelectedSubZoneId] = useState('');
  const [selectedRackId, setSelectedRackId] = useState('');

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

  // 2. Fetch Selected Master Product Details with Variants
  const { data: productDetailsData, isLoading: loadingProductDetails } = useQuery({
    queryKey: ['master-product-stockin-details', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return null;
      const res = await api.get(`/master-products/${selectedProductId}`);
      return res.data?.data;
    },
    enabled: !!selectedProductId,
  });

  // 3. Fetch Purchase Orders
  const { data: posData } = useQuery({
    queryKey: ['pos-stockin'],
    queryFn: async () => {
      const res = await api.get('/po', { params: { per_page: 100 } });
      return res.data?.data;
    },
  });

  // 4. Fetch Warehouses for Cascading Location Hierarchy
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-stockin'],
    queryFn: async () => {
      const res = await api.get('/attributes/warehouses', { params: { per_page: 50 } });
      return res.data?.data;
    },
  });

  // 5. Fetch Storage Locations
  const { data: locationsData } = useQuery({
    queryKey: ['locations-stockin'],
    queryFn: async () => {
      const res = await api.get('/attributes/locations', { params: { per_page: 200 } });
      return res.data?.data;
    },
  });

  const products: MasterProduct[] = Array.isArray(productsData?.data) ? productsData.data : Array.isArray(productsData) ? productsData : [];
  const pos: PO[] = Array.isArray(posData?.data) ? posData.data : Array.isArray(posData) ? posData : [];
  const warehouses: any[] = Array.isArray(warehousesData?.data) ? warehousesData.data : Array.isArray(warehousesData) ? warehousesData : [];
  const locations: StorageLocation[] = Array.isArray(locationsData?.data) ? locationsData.data : Array.isArray(locationsData) ? locationsData : [];

  // Cascading Location Hierarchy Helpers
  const getZonesForWarehouse = (wId: string) => {
    const w = warehouses.find((item) => item.id === wId);
    return w?.zones || [];
  };

  const getSubZonesForZone = (wId: string, zId: string) => {
    const zones = getZonesForWarehouse(wId);
    const z = zones.find((item: any) => item.id === zId);
    return z?.subZones || [];
  };

  const getRacksForSubZone = (wId: string, zId: string, szId: string) => {
    const subZones = getSubZonesForZone(wId, zId);
    const sz = subZones.find((item: any) => item.id === szId);
    return sz?.racks || [];
  };

  const findLocationId = (wId: string, zId?: string, szId?: string, rId?: string) => {
    if (rId) {
      const locByRack = locations.find((l) => l.rackId === rId);
      if (locByRack) return locByRack.id;
    }
    if (szId) {
      const locBySubZone = locations.find((l) => l.subZoneId === szId);
      if (locBySubZone) return locBySubZone.id;
    }
    if (zId) {
      const locByZone = locations.find((l) => l.zoneId === zId);
      if (locByZone) return locByZone.id;
    }
    if (wId) {
      const locByWarehouse = locations.find((l) => l.warehouseId === wId);
      if (locByWarehouse) return locByWarehouse.id;
    }
    return locations[0]?.id || '';
  };

  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);
  const availableZones: any[] = selectedWarehouse?.zones || [];
  const selectedZone = availableZones.find((z) => z.id === selectedZoneId);
  const availableSubZones: any[] = selectedZone?.subZones || [];
  const selectedSubZone = availableSubZones.find((sz) => sz.id === selectedSubZoneId);
  const availableRacks: any[] = selectedSubZone?.racks || [];

  const configuredVariants: any[] = productDetailsData?.variantProducts || [];

  // Cascading Colors: Only colors that have pre-configured variants for this Master Product
  const availableColors: Color[] = Array.from(
    new Map(
      configuredVariants
        .filter((v) => v.color)
        .map((v) => [v.colorId, v.color]),
    ).values(),
  );

  // Cascading Genders: Only genders that have pre-configured variants for selected (Product + Color)
  const availableGenders: ProductGender[] = Array.from(
    new Set(
      configuredVariants
        .filter((v) => v.colorId === selectedColorId)
        .map((v) => v.gender),
    ),
  ).filter(Boolean);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedColor = availableColors.find((c) => c.id === selectedColorId);

  // Human-Friendly Location Name Formatter
  const formatLocationName = (loc: any) => {
    if (!loc) return 'Unassigned';
    const parts = [];
    if (loc.warehouse?.name) parts.push(loc.warehouse.name);
    if (loc.rack?.name) parts.push(loc.rack.name);
    parts.push(loc.name || loc.code);
    return parts.join(' • ');
  };

  // Transition Step 1 ➔ Step 2: Auto-load existing variants for this Product+Color+Gender
  const handleProceedToMatrix = async () => {
    if (!selectedProductId) {
      setErrorMsg('Please select a Master Product Style.');
      return;
    }
    if (!selectedColorId) {
      setErrorMsg('Please select a Color Variation.');
      return;
    }
    if (!selectedGender) {
      setErrorMsg('Please select a Gender Classification.');
      return;
    }
    if (!productionDate) {
      setErrorMsg('Please enter a valid Production Date.');
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

      if (previewVariants.length === 0) {
        setErrorMsg(
          'No pre-configured variant sizes found for this Color and Gender. Product variants must be configured in Catalog Management before receiving stock.',
        );
        return;
      }

      const defaultW = warehouses[0];
      const defaultWId = defaultW?.id || '';
      const defaultZ = defaultW?.zones?.[0];
      const defaultZId = defaultZ?.id || '';
      const defaultSZ = defaultZ?.subZones?.[0];
      const defaultSZId = defaultSZ?.id || '';
      const defaultR = defaultSZ?.racks?.[0];
      const defaultRId = defaultR?.id || '';
      const defaultLocId = findLocationId(defaultWId, defaultZId, defaultSZId, defaultRId);

      setSelectedWarehouseId(defaultWId);
      setSelectedZoneId(defaultZId);
      setSelectedSubZoneId(defaultSZId);
      setSelectedRackId(defaultRId);
      setGlobalLocationId(defaultLocId);

      const rows: SizeRow[] = previewVariants.map((v: any) => ({
        variantProductId: v.id,
        size: v.size,
        sku: v.sku,
        receivedQty: 0,
        itemsPerPacket: v.itemsPerPacket || 1,
        warehouseId: defaultWId,
        zoneId: defaultZId,
        subZoneId: defaultSZId,
        rackId: defaultRId,
        locationId: defaultLocId,
      }));
      setSizeRows(rows);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          'Failed to load size matrix. Ensure variants are configured in Catalog Management.',
      );
    }
  };

  // Apply Global Location to All Rows
  const handleApplyLocationToAll = (
    wId: string,
    zId: string,
    szId: string,
    rId: string,
  ) => {
    const locId = findLocationId(wId, zId, szId, rId);
    setSelectedWarehouseId(wId);
    setSelectedZoneId(zId);
    setSelectedSubZoneId(szId);
    setSelectedRackId(rId);
    setGlobalLocationId(locId);

    setSizeRows((prev) =>
      prev.map((r) => ({
        ...r,
        warehouseId: wId,
        zoneId: zId,
        subZoneId: szId,
        rackId: rId,
        locationId: locId,
      })),
    );
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
      formData.append('stockInDate', new Date(stockInDate).toISOString());
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
            {/* Step 1.1: Master Product */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                1. Master Product Style <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setSelectedColorId('');
                  setSelectedGender('');
                }}
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

            {/* Step 1.2: Color Variation (Cascading) */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                2. Color Variation <span className="text-red-500">*</span>
              </label>
              <select
                required
                disabled={!selectedProductId || loadingProductDetails}
                value={selectedColorId}
                onChange={(e) => {
                  setSelectedColorId(e.target.value);
                  setSelectedGender('');
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="" disabled>
                  {!selectedProductId
                    ? '⚠️ First select a Master Product'
                    : loadingProductDetails
                    ? 'Loading configured colors...'
                    : availableColors.length === 0
                    ? 'No colors configured for this style'
                    : 'Select Color Variation'}
                </option>
                {availableColors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.code ? `(${c.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Step 1.3: Gender Classification (Cascading) */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                3. Gender Line <span className="text-red-500">*</span>
              </label>
              <select
                required
                disabled={!selectedColorId || availableGenders.length === 0}
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value as ProductGender)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="" disabled>
                  {!selectedColorId
                    ? '⚠️ First select a Color'
                    : availableGenders.length === 0
                    ? 'No gender lines for this color'
                    : 'Select Gender Line'}
                </option>
                {availableGenders.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock-In / Received Date */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Stock-In Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={stockInDate}
                onChange={(e) => setStockInDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
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
                <option value="">No PO Linked (General Stock-In)</option>
                {pos.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.poNumber} ({po.buyer?.name || 'Buyer N/A'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Supplier Invoice / Delivery Slip (PDF, PNG, JPG)
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer">
                <Upload className="h-4 w-4 text-slate-500" />
                <span>{invoiceFile ? invoiceFile.name : 'Upload Document'}</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                />
              </label>
              {invoiceFile && (
                <button
                  type="button"
                  onClick={() => setInvoiceFile(null)}
                  className="text-xs text-red-500 hover:underline cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Receiving Notes / Quality Remarks
            </label>
            <input
              type="text"
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
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">
              Quantity Matrix ({sizeRows.length} Catalog Sizes)
            </h3>
            <p className="text-xs text-slate-500">
              Enter received quantities and assign destination storage locations
            </p>
          </div>

          {/* Cascading Bulk Location Assignment Panel */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>🎯 Default Storage Location</span>
                <span className="text-[10px] font-normal text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                  Cascading Selection
                </span>
              </span>
              <span className="text-[11px] text-slate-500">
                Select Warehouse ➔ Zone ➔ Sub-Zone ➔ Rack to auto-assign all sizes below
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {/* 1. Warehouse */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  1. Warehouse
                </label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => {
                    const wId = e.target.value;
                    const z = getZonesForWarehouse(wId)[0];
                    const sz = getSubZonesForZone(wId, z?.id)[0];
                    const r = getRacksForSubZone(wId, z?.id, sz?.id)[0];
                    handleApplyLocationToAll(wId, z?.id || '', sz?.id || '', r?.id || '');
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Zone */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  2. Zone
                </label>
                <select
                  disabled={!selectedWarehouseId || availableZones.length === 0}
                  value={selectedZoneId}
                  onChange={(e) => {
                    const zId = e.target.value;
                    const sz = getSubZonesForZone(selectedWarehouseId, zId)[0];
                    const r = getRacksForSubZone(selectedWarehouseId, zId, sz?.id)[0];
                    handleApplyLocationToAll(selectedWarehouseId, zId, sz?.id || '', r?.id || '');
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {!selectedWarehouseId
                      ? 'Select Warehouse first'
                      : availableZones.length === 0
                      ? 'No zones configured'
                      : 'Select Zone'}
                  </option>
                  {availableZones.map((z: any) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Sub-Zone */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  3. Sub-Zone
                </label>
                <select
                  disabled={!selectedZoneId || availableSubZones.length === 0}
                  value={selectedSubZoneId}
                  onChange={(e) => {
                    const szId = e.target.value;
                    const r = getRacksForSubZone(selectedWarehouseId, selectedZoneId, szId)[0];
                    handleApplyLocationToAll(selectedWarehouseId, selectedZoneId, szId, r?.id || '');
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {!selectedZoneId
                      ? 'Select Zone first'
                      : availableSubZones.length === 0
                      ? 'No sub-zones'
                      : 'Select Sub-Zone'}
                  </option>
                  {availableSubZones.map((sz: any) => (
                    <option key={sz.id} value={sz.id}>
                      {sz.name} ({sz.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Rack Location */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  4. Rack Location
                </label>
                <select
                  disabled={!selectedSubZoneId || availableRacks.length === 0}
                  value={selectedRackId}
                  onChange={(e) => {
                    const rId = e.target.value;
                    handleApplyLocationToAll(selectedWarehouseId, selectedZoneId, selectedSubZoneId, rId);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {!selectedSubZoneId
                      ? 'Select Sub-Zone first'
                      : availableRacks.length === 0
                      ? 'No racks configured'
                      : 'Select Rack Location'}
                  </option>
                  {availableRacks.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.code ? `(${r.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Matrix Grid Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="border-b border-slate-100 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                <tr>
                  <th className="px-3 py-3 w-20">Size</th>
                  <th className="px-3 py-3 w-32">SKU</th>
                  <th className="px-3 py-3 w-28">Received *</th>
                  <th className="px-3 py-3 w-24">Packet</th>
                  <th className="px-3 py-3">Warehouse</th>
                  <th className="px-3 py-3">Zone</th>
                  <th className="px-3 py-3">Sub-Zone</th>
                  <th className="px-3 py-3">Rack Location *</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sizeRows.map((row, idx) => {
                  const rowZones = getZonesForWarehouse(row.warehouseId);
                  const rowSubZones = getSubZonesForZone(row.warehouseId, row.zoneId);
                  const rowRacks = getRacksForSubZone(row.warehouseId, row.zoneId, row.subZoneId);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      {/* Size */}
                      <td className="px-3 py-2.5">
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 font-bold text-slate-900 text-xs">
                          Size {row.size}
                        </span>
                      </td>

                      {/* SKU */}
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
                        {row.sku || `${selectedProduct?.sku}-${selectedColor?.name?.slice(0, 3).toUpperCase()}-${row.size}`}
                      </td>

                      {/* Received Qty */}
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          min="0"
                          value={row.receivedQty === 0 ? '' : row.receivedQty}
                          onChange={(e) => updateRow(idx, { receivedQty: Number(e.target.value) || 0 })}
                          placeholder="0"
                          className="w-full font-bold text-xs rounded-lg border border-slate-200 px-2 py-1 text-slate-900 focus:border-blue-500 focus:outline-hidden"
                        />
                      </td>

                      {/* Items / Packet */}
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                          {row.itemsPerPacket || 1}/pkt
                        </span>
                      </td>

                      {/* Warehouse Selector */}
                      <td className="px-2 py-2.5">
                        <select
                          value={row.warehouseId}
                          onChange={(e) => {
                            const wId = e.target.value;
                            const z = getZonesForWarehouse(wId)[0];
                            const sz = getSubZonesForZone(wId, z?.id)[0];
                            const r = getRacksForSubZone(wId, z?.id, sz?.id)[0];
                            const locId = findLocationId(wId, z?.id, sz?.id, r?.id);
                            updateRow(idx, {
                              warehouseId: wId,
                              zoneId: z?.id || '',
                              subZoneId: sz?.id || '',
                              rackId: r?.id || '',
                              locationId: locId,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                        >
                          <option value="">Warehouse</option>
                          {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Zone Selector */}
                      <td className="px-2 py-2.5">
                        <select
                          disabled={!row.warehouseId || rowZones.length === 0}
                          value={row.zoneId}
                          onChange={(e) => {
                            const zId = e.target.value;
                            const sz = getSubZonesForZone(row.warehouseId, zId)[0];
                            const r = getRacksForSubZone(row.warehouseId, zId, sz?.id)[0];
                            const locId = findLocationId(row.warehouseId, zId, sz?.id, r?.id);
                            updateRow(idx, {
                              zoneId: zId,
                              subZoneId: sz?.id || '',
                              rackId: r?.id || '',
                              locationId: locId,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">Zone</option>
                          {rowZones.map((z: any) => (
                            <option key={z.id} value={z.id}>
                              {z.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Sub-Zone Selector */}
                      <td className="px-2 py-2.5">
                        <select
                          disabled={!row.zoneId || rowSubZones.length === 0}
                          value={row.subZoneId}
                          onChange={(e) => {
                            const szId = e.target.value;
                            const r = getRacksForSubZone(row.warehouseId, row.zoneId, szId)[0];
                            const locId = findLocationId(row.warehouseId, row.zoneId, szId, r?.id);
                            updateRow(idx, {
                              subZoneId: szId,
                              rackId: r?.id || '',
                              locationId: locId,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">Sub-Zone</option>
                          {rowSubZones.map((sz: any) => (
                            <option key={sz.id} value={sz.id}>
                              {sz.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Rack Location Selector */}
                      <td className="px-2 py-2.5">
                        <select
                          disabled={!row.subZoneId || rowRacks.length === 0}
                          value={row.rackId}
                          onChange={(e) => {
                            const rId = e.target.value;
                            const locId = findLocationId(row.warehouseId, row.zoneId, row.subZoneId, rId);
                            updateRow(idx, {
                              rackId: rId,
                              locationId: locId,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 font-semibold focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">Rack</option>
                          {rowRacks.map((r: any) => (
                            <option key={r.id} value={r.id}>
                              {r.name} {r.code ? `(${r.code})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
