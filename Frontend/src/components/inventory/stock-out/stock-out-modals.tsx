'use client';

import React, { useState } from 'react';
import { StockOut, StockOutStatus } from '@/types/inventory';
import { Modal } from '@/components/common/modal';
import { formatDate } from '@/lib/utils';
import {
  CheckCircle2,
  Ban,
  AlertCircle,
  Loader2,
  FileCheck,
  CreditCard,
} from 'lucide-react';

interface DeliveredModalProps {
  challan: StockOut | null;
  onClose: () => void;
  onConfirm: (id: string, newStatus: StockOutStatus, doc?: File) => Promise<void>;
  isUpdating: boolean;
}

export function DeliveredModal({
  challan,
  onClose,
  onConfirm,
  isUpdating,
}: DeliveredModalProps) {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  if (!challan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(challan.id, 'DELIVERED', receiptFile || undefined);
    setReceiptFile(null);
  };

  return (
    <Modal
      isOpen={Boolean(challan)}
      onClose={onClose}
      icon={<FileCheck className="h-5 w-5 text-emerald-600" />}
      title="Confirm Delivery Receipt"
      description={`Challan Number: ${challan.challanNumber}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500">
          Confirming physical delivery receipt for challan{' '}
          <strong className="font-mono text-slate-800">{challan.challanNumber}</strong>. You can optionally attach the signed receiver slip or bill of lading.
        </p>

        <div>
          <label
            htmlFor="receiver-doc-input"
            className="mb-1 block text-xs font-semibold text-slate-700"
          >
            Signed Receiver Slip / Document (Optional)
          </label>
          <input
            id="receiver-doc-input"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100 min-h-[40px] cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-h-[40px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUpdating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer min-h-[40px]"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Confirming...</span>
              </>
            ) : (
              <span>Confirm Delivery</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface PaymentSettleModalProps {
  challan: StockOut | null;
  onClose: () => void;
  onConfirm: (id: string, newStatus: StockOutStatus) => Promise<void>;
  isUpdating: boolean;
}

export function PaymentSettleModal({
  challan,
  onClose,
  onConfirm,
  isUpdating,
}: PaymentSettleModalProps) {
  const [paymentNote, setPaymentNote] = useState('');

  if (!challan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(challan.id, 'PAYMENT_RECEIVED');
    setPaymentNote('');
  };

  return (
    <Modal
      isOpen={Boolean(challan)}
      onClose={onClose}
      icon={<CreditCard className="h-5 w-5 text-purple-600" />}
      title="Confirm Payment Settlement"
      description={`Challan Number: ${challan.challanNumber}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-xs space-y-1 text-slate-600">
          <div>
            <span className="text-slate-400">Buyer: </span>
            <strong className="text-slate-800">
              {challan.buyer?.name || challan.po?.buyer?.name || 'Factory Dispatch'}
            </strong>
          </div>
          {challan.po && (
            <div>
              <span className="text-slate-400">PO Number: </span>
              <span className="font-mono font-semibold text-blue-600">{challan.po.poNumber}</span>
            </div>
          )}
          <div>
            <span className="text-slate-400">Dispatch Date: </span>
            <span>{formatDate(challan.dispatchDate)}</span>
          </div>
        </div>

        <div>
          <label
            htmlFor="payment-note-input"
            className="mb-1 block text-xs font-semibold text-slate-700"
          >
            Payment Reference / Bank TT Notes (Optional)
          </label>
          <input
            id="payment-note-input"
            type="text"
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
            placeholder="e.g. Bank Wire Ref #TX-8821 / Fully Cleared"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden min-h-[40px]"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-h-[40px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUpdating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 transition disabled:opacity-50 cursor-pointer min-h-[40px]"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Confirm Settlement</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface CancelChallanModalProps {
  challan: StockOut | null;
  onClose: () => void;
  onConfirm: (id: string, challanNumber: string, note?: string) => Promise<void>;
}

export function CancelChallanModal({
  challan,
  onClose,
  onConfirm,
}: CancelChallanModalProps) {
  const [cancelNote, setCancelNote] = useState('');

  if (!challan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(challan.id, challan.challanNumber, cancelNote);
    setCancelNote('');
  };

  return (
    <Modal
      isOpen={Boolean(challan)}
      onClose={onClose}
      icon={<Ban className="h-5 w-5 text-rose-600" />}
      title="Cancel Delivery Challan"
      description={`Challan Number: ${challan.challanNumber}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span>Automatic Stock Restoration</span>
          </div>
          <p>
            Cancelling this challan will immediately restore all dispatched pairs back to active warehouse batch inventory balances.
          </p>
        </div>

        <div>
          <label
            htmlFor="cancel-note-input"
            className="mb-1 block text-xs font-semibold text-slate-700"
          >
            Cancellation Reason (Optional)
          </label>
          <input
            id="cancel-note-input"
            type="text"
            value={cancelNote}
            onChange={(e) => setCancelNote(e.target.value)}
            placeholder="e.g. Order cancelled by buyer / incorrect quantity"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden min-h-[40px]"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-h-[40px]"
          >
            Keep Active
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition cursor-pointer min-h-[40px]"
          >
            <span>Confirm Cancel Challan</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
