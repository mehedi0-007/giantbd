'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { StockOut, StockOutStatus } from '@/types/inventory';
import { ChallanPdfModal } from '@/components/inventory/challan-pdf-modal';
import {
  StockOutTable,
  DeliveredModal,
  PaymentSettleModal,
  CancelChallanModal,
} from '@/components/inventory/stock-out';
import { toast } from 'sonner';

export default function StockOutListPage() {
  const queryClient = useQueryClient();

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

  const challans: StockOut[] = Array.isArray(challansData?.data)
    ? challansData.data
    : Array.isArray(challansData)
      ? challansData
      : [];

  const totalPages = challansData?.total_page || 1;
  const totalCount = challansData?.total || challans.length;

  // Invalidate queries after mutations
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-outs'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
    queryClient.invalidateQueries({ queryKey: ['live-stock'] });
    queryClient.invalidateQueries({ queryKey: ['available-batches-for-dispatch'] });
  };

  // Update Status Mutation (Delivered / Settled)
  const handleUpdateStatus = async (id: string, newStatus: StockOutStatus, doc?: File) => {
    setIsUpdatingStatus(true);
    try {
      if (doc) {
        const formData = new FormData();
        formData.append('status', newStatus);
        formData.append('receiptDocument', doc);
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

  const handleResetFilters = () => {
    setSearch('');
    setBuyerFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setPage(1);
  };

  return (
    <div className="space-y-6 mx-auto pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Delivery Challans & Stock-Out List
            </h1>
            <span className="badge-giant">
              Registry
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitor goods dispatch records, track delivery confirmations, manage settlements, and print official 3-copy challans
          </p>
        </div>
      </div>

      {/* Challan Registry Table Component */}
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
        onPrintChallan={setSelectedChallanForPrint}
        onOpenDelivered={setDeliveringChallan}
        onOpenPaymentSettle={setPaymentSettlingChallan}
        onOpenCancel={setCancellingChallan}
      />

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
