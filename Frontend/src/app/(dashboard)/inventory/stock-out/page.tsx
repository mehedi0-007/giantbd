'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { StockOut, StockOutStatus } from '@/types/inventory';
import { PO } from '@/types/commercial';
import { ChallanPdfModal } from '@/components/inventory/challan-pdf-modal';
import {
  StockOutTable,
  StockOutCreateForm,
  DeliveredModal,
  PaymentSettleModal,
  CancelChallanModal,
} from '@/components/inventory/stock-out';
import { toast } from 'sonner';
import { Truck, FileText } from 'lucide-react';

export default function StockOutPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'registry' | 'create'>('registry');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Print Challan Modal State
  const [selectedChallanForPrint, setSelectedChallanForPrint] = useState<StockOut | null>(null);

  // Action Modals State
  const [deliveringChallan, setDeliveringChallan] = useState<StockOut | null>(null);
  const [paymentSettlingChallan, setPaymentSettlingChallan] = useState<StockOut | null>(null);
  const [cancellingChallan, setCancellingChallan] = useState<StockOut | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Form States for Create Challan
  const [selectedLcId, setSelectedLcId] = useState('');
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedColorId, setSelectedColorId] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [destination, setDestination] = useState('');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Interactive Batch & Item Selection States
  const [expandedBatchIds, setExpandedBatchIds] = useState<Record<string, boolean>>({});
  const [selectedItemQuantities, setSelectedItemQuantities] = useState<Record<string, number>>({});

  // 1. Fetch Buyers for filter dropdown
  const { data: buyersData } = useQuery({
    queryKey: ['buyers-challan-filter'],
    queryFn: async () => {
      const res = await api.get('/buyers', { params: { per_page: 100 } });
      return res.data?.data;
    },
  });

  const buyers: any[] = Array.isArray(buyersData?.data)
    ? buyersData.data
    : Array.isArray(buyersData)
      ? buyersData
      : [];

  // 2. Fetch Challans List
  const { data: challansData, isLoading: loadingChallans, isFetching } = useQuery({
    queryKey: ['stock-outs', page, pageSize, search, statusFilter, buyerFilter, typeFilter],
    queryFn: async () => {
      const res = await api.get('/inventory/stock-out', {
        params: {
          page,
          per_page: pageSize,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          buyerId: buyerFilter || undefined,
          type: typeFilter || undefined,
        },
      });
      return res.data?.data;
    },
  });

  // 3. Fetch LCs for Dispatch Selection
  const { data: lcsData } = useQuery({
    queryKey: ['lcs-for-dispatch'],
    queryFn: async () => {
      const res = await api.get('/lc', { params: { per_page: 100 } });
      return res.data?.data;
    },
    enabled: activeTab === 'create',
  });

  // 4. Fetch Active Purchase Orders for Dispatch
  const { data: posData } = useQuery({
    queryKey: ['pos-for-dispatch'],
    queryFn: async () => {
      const res = await api.get('/po', { params: { per_page: 100 } });
      return res.data?.data;
    },
    enabled: activeTab === 'create',
  });

  // 5. Fetch Master Products
  const { data: productsData } = useQuery({
    queryKey: ['master-products-dispatch'],
    queryFn: async () => {
      const res = await api.get('/master-products', { params: { per_page: 100 } });
      return res.data?.data;
    },
    enabled: activeTab === 'create',
  });

  // 6. Fetch Selected Master Product Details with Variants
  const { data: productDetailsData, isLoading: loadingProductDetails } = useQuery({
    queryKey: ['master-product-dispatch-details', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return null;
      const res = await api.get(`/master-products/${selectedProductId}`);
      return res.data?.data;
    },
    enabled: !!selectedProductId && activeTab === 'create',
  });

  // 7. Fetch All Available Batches for Dispatch Selection
  const { data: batchesData, isLoading: loadingBatches } = useQuery({
    queryKey: ['available-batches-for-dispatch'],
    queryFn: async () => {
      const res = await api.get('/inventory/batches', {
        params: { per_page: 100 },
      });
      return res.data?.data;
    },
    enabled: activeTab === 'create',
  });

  const challans: StockOut[] = Array.isArray(challansData?.data)
    ? challansData.data
    : Array.isArray(challansData)
      ? challansData
      : [];

  const totalCount = challansData?.total || challans.length;
  const totalPages = challansData?.total_page || 1;

  const lcs: any[] = Array.isArray(lcsData?.data) ? lcsData.data : Array.isArray(lcsData) ? lcsData : [];
  const pos: PO[] = Array.isArray(posData?.data) ? posData.data : Array.isArray(posData) ? posData : [];
  const products: any[] = Array.isArray(productsData?.data) ? productsData.data : Array.isArray(productsData) ? productsData : [];
  const allBatches: any[] = Array.isArray(batchesData?.data) ? batchesData.data : Array.isArray(batchesData) ? batchesData : [];

  // Cascading Colors from Product
  const configuredVariants: any[] = productDetailsData?.variantProducts || [];
  const availableColors: any[] = Array.from(
    new Map(
      configuredVariants
        .filter((v) => v.color)
        .map((v) => [v.colorId, v.color]),
    ).values(),
  );

  // Cascading Genders for (Product + Color)
  const availableGenders: string[] = Array.from(
    new Set(
      configuredVariants
        .filter((v) => v.colorId === selectedColorId)
        .map((v) => v.gender),
    ),
  ).filter(Boolean);

  const isHierarchyComplete = Boolean(
    selectedLcId && selectedPoId && selectedProductId && selectedColorId && selectedGender,
  );

  // Filter available batches matching selected Style, Color, and Gender
  const availableBatches = !isHierarchyComplete
    ? []
    : allBatches.filter((b) => {
      const items: any[] = b.batchItems || [];
      const matchingItems = items.filter((i) => {
        const p = i.product;
        const matchProd =
          p?.masterProductId === selectedProductId ||
          p?.masterProduct?.id === selectedProductId;
        const matchColor =
          p?.colorId === selectedColorId || p?.color?.id === selectedColorId;
        const matchGender =
          (p?.gender || p?.masterProduct?.gender) === selectedGender;
        const hasQty = (i.availableQty ?? i.receivedQty ?? 0) > 0;
        return matchProd && matchColor && matchGender && hasQty;
      });
      return matchingItems.length > 0;
    });

  // Batch accordion toggle
  const toggleBatchExpand = (id: string) => {
    setExpandedBatchIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Item quantity change
  const handleItemQtyChange = (batchItemId: string, maxAvailable: number, qty: number) => {
    const validQty = Math.max(0, Math.min(maxAvailable, qty));
    setSelectedItemQuantities((prev) => {
      const updated = { ...prev };
      if (validQty <= 0) {
        delete updated[batchItemId];
      } else {
        updated[batchItemId] = validQty;
      }
      return updated;
    });
  };

  // Select / Deselect All Items in a Batch
  const handleToggleSelectBatch = (batch: any) => {
    const items: any[] = batch.batchItems || [];
    const allSelected = items.every((i) => (selectedItemQuantities[i.id] || 0) > 0);

    setSelectedItemQuantities((prev) => {
      const updated = { ...prev };
      items.forEach((i) => {
        const avail = i.availableQty ?? i.receivedQty ?? 0;
        if (allSelected) {
          delete updated[i.id];
        } else if (avail > 0) {
          updated[i.id] = avail;
        }
      });
      return updated;
    });
  };

  // Invalidate queries after mutations
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-outs'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
    queryClient.invalidateQueries({ queryKey: ['live-stock'] });
    queryClient.invalidateQueries({ queryKey: ['available-batches-for-dispatch'] });
  };

  // Update Status Mutation
  const handleUpdateStatus = async (id: string, newStatus: StockOutStatus, doc?: File) => {
    setIsUpdatingStatus(true);
    try {
      if (doc) {
        const formData = new FormData();
        formData.append('status', newStatus);
        formData.append('document', doc);
        await api.patch(`/inventory/stock-out/${id}/status`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.patch(`/inventory/stock-out/${id}/status`, { status: newStatus });
      }

      invalidateAll();
      toast.success('Challan status updated successfully');
      setDeliveringChallan(null);
      setPaymentSettlingChallan(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update challan status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Cancel Challan Mutation
  const handleCancelChallan = async (id: string, challanNumber: string, cancelNote?: string) => {
    try {
      await api.post(`/inventory/stock-out/${id}/cancel`, {
        note: cancelNote?.trim() || 'Cancelled via dashboard',
      });
      toast.success(`Challan ${challanNumber} cancelled successfully`);
      invalidateAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel challan.');
    }
  };

  // Create Challan Submit
  const handleCreateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLcId) {
      setFormError('Please select a Letter of Credit (LC).');
      return;
    }
    if (!selectedPoId) {
      setFormError('Please select a Purchase Order (PO).');
      return;
    }
    if (!selectedProductId) {
      setFormError('Please select a Master Product style.');
      return;
    }
    if (!selectedColorId) {
      setFormError('Please select a Color.');
      return;
    }
    if (!selectedGender) {
      setFormError('Please select a Gender Line.');
      return;
    }

    const itemsToDispatch = Object.entries(selectedItemQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([batchItemId, quantity]) => ({ batchItemId, issueQty: quantity }));

    if (itemsToDispatch.length === 0) {
      setFormError('Please select at least one batch size item with quantity > 0.');
      return;
    }

    setIsCreating(true);
    setFormError('');

    try {
      const selectedPo = pos.find((p) => p.id === selectedPoId);
      const payload = {
        type: 'PO_SHIPMENT',
        poId: selectedPoId,
        buyerId: selectedPo?.buyerId || selectedPo?.buyer?.id,
        dispatchDate: new Date(dispatchDate).toISOString(),
        destination: destination.trim() || undefined,
        note: note.trim() || undefined,
        items: itemsToDispatch,
      };

      const res = await api.post('/inventory/stock-out', payload);
      const createdChallan = res.data?.data;

      toast.success(`Delivery Challan ${createdChallan?.challanNumber || ''} created successfully!`);
      invalidateAll();

      // Reset form and switch to registry tab
      setSelectedLcId('');
      setSelectedPoId('');
      setSelectedProductId('');
      setSelectedColorId('');
      setSelectedGender('');
      setSelectedItemQuantities({});
      setDestination('');
      setNote('');
      setActiveTab('registry');

      if (createdChallan) {
        setSelectedChallanForPrint(createdChallan);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to generate delivery challan.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setBuyerFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Goods Dispatch & Delivery Challans
            </h1>
            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
              Stock-Out
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate 3-copy delivery challans against buyer PO contracts, dispatch production batches, and monitor delivery confirmations
          </p>
        </div>

        {activeTab === 'registry' && (
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer min-h-[40px]"
          >
            <Truck className="h-4 w-4" />
            <span>Dispatch New Shipment</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'registry'}
          onClick={() => setActiveTab('registry')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer min-h-[40px] ${activeTab === 'registry'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          <FileText className="h-4 w-4" />
          <span>Delivery Challan Registry</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'create'}
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer min-h-[40px] ${activeTab === 'create'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          <Truck className="h-4 w-4" />
          <span>Dispatch New Shipment</span>
        </button>
      </div>

      {/* TAB 1: CHALLAN REGISTRY TABLE */}
      {activeTab === 'registry' && (
        <StockOutTable
          challans={challans}
          isLoading={loadingChallans}
          isFetching={isFetching}
          buyers={buyers}
          search={search}
          onSearchChange={setSearch}
          buyerFilter={buyerFilter}
          onBuyerFilterChange={setBuyerFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onResetFilters={handleResetFilters}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onOpenCreate={() => setActiveTab('create')}
          onPrintChallan={setSelectedChallanForPrint}
          onOpenDelivered={setDeliveringChallan}
          onOpenPaymentSettle={setPaymentSettlingChallan}
          onOpenCancel={setCancellingChallan}
        />
      )}

      {/* TAB 2: CREATE CHALLAN */}
      {activeTab === 'create' && (
        <StockOutCreateForm
          lcs={lcs}
          pos={pos}
          products={products}
          availableColors={availableColors}
          availableGenders={availableGenders}
          selectedLcId={selectedLcId}
          onLcChange={(id) => {
            setSelectedLcId(id);
            setSelectedPoId('');
            setSelectedProductId('');
            setSelectedColorId('');
            setSelectedGender('');
            setSelectedItemQuantities({});
          }}
          selectedPoId={selectedPoId}
          onPoChange={(id) => {
            setSelectedPoId(id);
            setSelectedProductId('');
            setSelectedColorId('');
            setSelectedGender('');
            setSelectedItemQuantities({});
          }}
          selectedProductId={selectedProductId}
          onProductChange={(id) => {
            setSelectedProductId(id);
            setSelectedColorId('');
            setSelectedGender('');
            setSelectedItemQuantities({});
          }}
          selectedColorId={selectedColorId}
          onColorChange={(id) => {
            setSelectedColorId(id);
            setSelectedGender('');
            setSelectedItemQuantities({});
          }}
          selectedGender={selectedGender}
          onGenderChange={(g) => {
            setSelectedGender(g);
            setSelectedItemQuantities({});
          }}
          destination={destination}
          onDestinationChange={setDestination}
          dispatchDate={dispatchDate}
          onDispatchDateChange={setDispatchDate}
          note={note}
          onNoteChange={setNote}
          formError={formError}
          isCreating={isCreating}
          loadingProductDetails={loadingProductDetails}
          loadingBatches={loadingBatches}
          availableBatches={availableBatches}
          expandedBatchIds={expandedBatchIds}
          onToggleBatchExpand={toggleBatchExpand}
          selectedItemQuantities={selectedItemQuantities}
          onItemQtyChange={handleItemQtyChange}
          onToggleSelectBatch={handleToggleSelectBatch}
          onCancel={() => {
            setActiveTab('registry');
            setSelectedItemQuantities({});
          }}
          onSubmit={handleCreateChallan}
        />
      )}

      {/* Printable 3-Copy Challan PDF Document Modal */}
      <ChallanPdfModal
        isOpen={Boolean(selectedChallanForPrint)}
        onClose={() => setSelectedChallanForPrint(null)}
        challan={selectedChallanForPrint}
      />

      {/* Mark Delivered Modal */}
      <DeliveredModal
        challan={deliveringChallan}
        onClose={() => setDeliveringChallan(null)}
        onConfirm={handleUpdateStatus}
        isUpdating={isUpdatingStatus}
      />

      {/* Payment Settlement Modal */}
      <PaymentSettleModal
        challan={paymentSettlingChallan}
        onClose={() => setPaymentSettlingChallan(null)}
        onConfirm={handleUpdateStatus}
        isUpdating={isUpdatingStatus}
      />

      {/* Cancel Challan Modal */}
      <CancelChallanModal
        challan={cancellingChallan}
        onClose={() => setCancellingChallan(null)}
        onConfirm={handleCancelChallan}
      />
    </div>
  );
}
