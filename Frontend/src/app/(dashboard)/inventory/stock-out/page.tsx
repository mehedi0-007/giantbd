'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PO } from '@/types/commercial';
import { StockOutCreateForm } from '@/components/inventory/stock-out';
import { ChallanPdfModal } from '@/components/inventory/challan-pdf-modal';
import { toast } from 'sonner';

export default function StockOutPage() {
  const queryClient = useQueryClient();

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

  // 1. Fetch LCs for Dispatch Selection
  const { data: lcsData } = useQuery({
    queryKey: ['lcs-for-dispatch'],
    queryFn: async () => {
      const res = await api.get('/lc', { params: { per_page: 100 } });
      return res.data?.data;
    },
  });

  // 2. Fetch Active Purchase Orders for Dispatch
  const { data: posData } = useQuery({
    queryKey: ['pos-for-dispatch'],
    queryFn: async () => {
      const res = await api.get('/po', { params: { per_page: 100 } });
      return res.data?.data;
    },
  });

  const rawLcs: any[] = Array.isArray(lcsData?.data)
    ? lcsData.data
    : Array.isArray(lcsData)
      ? lcsData
      : [];
  const lcs = rawLcs.filter((lc) => lc.status !== 'CANCELLED');

  const rawPos: PO[] = Array.isArray(posData?.data)
    ? posData.data
    : Array.isArray(posData)
      ? posData
      : [];
  const pos = rawPos.filter((po) => po.status !== 'CANCELLED');

  // 3. Fetch Master Products from Catalog
  const { data: masterProductsData } = useQuery({
    queryKey: ['master-products-stockout'],
    queryFn: async () => {
      const res = await api.get('/master-products', { params: { per_page: 100 } });
      return res.data?.data;
    },
  });

  const products: any[] = Array.isArray(masterProductsData?.data)
    ? masterProductsData.data
    : Array.isArray(masterProductsData)
      ? masterProductsData
      : [];

  // 4. Fetch Selected Master Product Details with Configured Variants
  const { data: productDetailsData, isLoading: loadingProductDetails } = useQuery({
    queryKey: ['master-product-stockout-details', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return null;
      const res = await api.get(`/master-products/${selectedProductId}`);
      return res.data?.data;
    },
    enabled: !!selectedProductId,
  });

  const configuredVariants: any[] =
    productDetailsData?.variantProducts || productDetailsData?.variants || [];

  // Extract distinct colors for selected master product from its variants
  const availableColors = React.useMemo(() => {
    if (!configuredVariants.length) return [];
    return Array.from(
      new Map(
        configuredVariants
          .filter((v) => v.color)
          .map((v) => [v.colorId || v.color.id, v.color]),
      ).values(),
    );
  }, [configuredVariants]);

  // Extract distinct genders for selected product and color
  const availableGenders = React.useMemo(() => {
    if (!selectedColorId || !configuredVariants.length) return [];
    return Array.from(
      new Set(
        configuredVariants
          .filter((v) => (v.colorId || v.color?.id) === selectedColorId)
          .map((v) => v.gender),
      ),
    ).filter(Boolean);
  }, [configuredVariants, selectedColorId]);

  // 4. Fetch Available Production Batches in Warehouse for this combination
  const { data: batchesData, isLoading: loadingBatches } = useQuery({
    queryKey: ['available-batches-for-dispatch', selectedProductId, selectedColorId, selectedGender],
    queryFn: async () => {
      if (!selectedProductId || !selectedColorId || !selectedGender) return [];
      const res = await api.get('/inventory/batches', {
        params: {
          masterProductId: selectedProductId,
          colorId: selectedColorId,
          gender: selectedGender,
          status: 'COMPLETED',
        },
      });
      return res.data?.data || [];
    },
    enabled: Boolean(selectedProductId && selectedColorId && selectedGender),
  });

  const availableBatches: any[] = Array.isArray(batchesData) ? batchesData : [];

  // Toggle batch accordion
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

  // Print Challan Modal State for freshly created challan
  const [createdChallanForPrint, setCreatedChallanForPrint] = useState<any | null>(null);

  const resetForm = () => {
    setSelectedLcId('');
    setSelectedPoId('');
    setSelectedProductId('');
    setSelectedColorId('');
    setSelectedGender('');
    setSelectedItemQuantities({});
    setDestination('');
    setNote('');
    setFormError('');
  };

  // Invalidate queries after mutations
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-outs'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
    queryClient.invalidateQueries({ queryKey: ['live-stock'] });
    queryClient.invalidateQueries({ queryKey: ['available-batches-for-dispatch'] });
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
      setFormError('Please select a Master Product.');
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
      resetForm();

      if (createdChallan) {
        setCreatedChallanForPrint(createdChallan);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to generate delivery challan.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 mx-auto pb-16">
      {/* Top Header Bar */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dispatch New Stock Out
          </h1>
          <span className="badge-giant">
            Stock-Out
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Select LC, PO, style and allocate production batch quantities to dispatch shipments and issue delivery challans
        </p>
      </div>

      {/* CREATE CHALLAN FORM */}
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
        onCancel={resetForm}
        onSubmit={handleCreateChallan}
      />

      {/* Printable 3-Copy Challan PDF Document Modal */}
      {createdChallanForPrint && (
        <ChallanPdfModal
          isOpen={Boolean(createdChallanForPrint)}
          onClose={() => setCreatedChallanForPrint(null)}
          challan={createdChallanForPrint}
        />
      )}
    </div>
  );
}
