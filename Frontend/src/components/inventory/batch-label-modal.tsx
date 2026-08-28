'use client';

import React from 'react';
import Barcode from 'react-barcode';
import { formatDate, formatNumber } from '@/lib/utils';
import { Modal } from '@/components/common/modal';
import { Printer, Boxes, CheckCircle2 } from 'lucide-react';

interface BatchLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchData?: {
    batchId: string;
    batchNumber?: string;
    productName: string;
    colorName: string;
    gender: string;
    productionDate: string;
    expirationDate?: string;
    totalPairs: number;
  } | null;
}

export function BatchLabelModal({
  isOpen,
  onClose,
  batchData,
}: BatchLabelModalProps) {
  if (!batchData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
      title="Batch Created Successfully"
      description="Official inventory lot sticker"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full no-print">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-h-[40px]"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer min-h-[40px]"
          >
            <Printer className="h-4 w-4" />
            <span>Print Lot Sticker</span>
          </button>
        </div>
      }
    >
      {/* Printable Batch Label Sheet */}
      <div className="printable-area rounded-xl border-2 border-dashed border-slate-300 p-5 bg-white text-center">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white">
              <Boxes className="h-3 w-3" />
            </div>
            <span className="font-bold text-xs tracking-wider uppercase text-slate-900">
              Giant BD Inventory
            </span>
          </div>
          <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
            {batchData.gender}
          </span>
        </div>

        {/* Product Details */}
        <div className="text-left space-y-1 mb-3 text-xs">
          <div className="font-bold text-sm text-slate-900">
            {batchData.productName}
          </div>
          <div className="text-slate-600 font-medium">
            Color: <strong className="text-slate-800">{batchData.colorName}</strong> • Total: <strong className="text-emerald-700">{formatNumber(batchData.totalPairs)} pairs</strong>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Prod: {formatDate(batchData.productionDate)}</span>
            <span>Exp: {formatDate(batchData.expirationDate)}</span>
          </div>
        </div>

        {/* Code 128 Barcode */}
        <div className="my-2 bg-white p-2 rounded flex flex-col items-center justify-center border border-slate-100">
          <Barcode
            value={batchData.batchId}
            format="CODE128"
            width={1.6}
            height={50}
            displayValue={true}
            font="monospace"
            fontSize={12}
            margin={0}
          />
        </div>

        {/* Batch Number Pill */}
        {batchData.batchNumber && (
          <div className="mt-2 inline-block rounded-md bg-slate-100 px-3 py-1 font-mono text-xs font-extrabold text-slate-900 border border-slate-200">
            Lot: {batchData.batchNumber}
          </div>
        )}
      </div>
    </Modal>
  );
}
