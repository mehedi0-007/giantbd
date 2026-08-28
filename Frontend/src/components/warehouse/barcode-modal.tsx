'use client';

import React from 'react';
import { StorageLocation } from '@/types/warehouse';
import Barcode from 'react-barcode';
import { Modal } from '@/components/common/modal';
import { Printer, Boxes } from 'lucide-react';

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: StorageLocation | null;
}

export function BarcodeModal({ isOpen, onClose, location }: BarcodeModalProps) {
  if (!location) return null;

  const handlePrint = () => {
    window.print();
  };

  const barcodeValue = location.barcode || location.code;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<Printer className="h-5 w-5" />}
      title="Location Barcode Sticker"
      description={`Print rack slot label for ${location.code}`}
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
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer min-h-[40px]"
          >
            <Printer className="h-4 w-4" />
            <span>Print Sticker</span>
          </button>
        </div>
      }
    >
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
        <div className="text-xs font-semibold text-slate-500 mb-3">
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
    </Modal>
  );
}
