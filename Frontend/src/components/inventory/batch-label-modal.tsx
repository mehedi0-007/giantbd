'use client';

import Barcode from 'react-barcode';
import { formatDate, formatNumber } from '@/lib/utils';
import { X, Printer, Boxes, CheckCircle2 } from 'lucide-react';

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
  if (!isOpen || !batchData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs no-print"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 no-print">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Batch Created Successfully
              </h3>
              <p className="text-xs text-slate-500">Official inventory lot sticker</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

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

          {/* Lot Number */}
          {batchData.batchNumber && (
            <div className="text-[11px] font-semibold text-slate-600 mt-1">
              Lot / Roll: {batchData.batchNumber}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-5 no-print">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Done
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print Batch Label</span>
          </button>
        </div>
      </div>
    </div>
  );
}
