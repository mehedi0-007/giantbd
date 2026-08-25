'use client';

import { StorageLocation } from '@/types/warehouse';
import Barcode from 'react-barcode';
import { X, Printer, Boxes } from 'lucide-react';

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: StorageLocation | null;
}

export function BarcodeModal({ isOpen, onClose, location }: BarcodeModalProps) {
  if (!isOpen || !location) return null;

  const handlePrint = () => {
    window.print();
  };

  const barcodeValue = location.barcode || location.code;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs no-print"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Header (No print) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 no-print">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Printer className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Location Barcode Sticker
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Printable Sticker Sheet Area */}
        <div className="printable-area flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 bg-white text-center">
          {/* Company Branding */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white">
              <Boxes className="h-3 w-3" />
            </div>
            <span className="font-bold text-xs tracking-wider uppercase text-slate-900">
              Giant BD Warehouse
            </span>
          </div>

          {/* Location Hierarchy Path */}
          <div className="text-[11px] font-semibold text-slate-500 mb-3">
            {location.warehouse?.name || 'WH'} &bull; {location.zone?.name || 'Zone'} &bull; Rack {location.rack?.code || location.rack?.name || 'R'}
          </div>

          {/* Code 128 Barcode */}
          <div className="my-2 bg-white p-2 rounded flex justify-center">
            <Barcode
              value={barcodeValue}
              format="CODE128"
              width={1.8}
              height={55}
              displayValue={true}
              font="monospace"
              fontSize={13}
              margin={0}
            />
          </div>

          {/* Location Code Pill */}
          <div className="mt-2 inline-block rounded-md bg-slate-100 px-3 py-1 font-mono text-xs font-extrabold text-slate-900 border border-slate-200">
            {location.code}
          </div>
        </div>

        {/* Actions (No print) */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-5 no-print">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print Sticker (Code 128)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
