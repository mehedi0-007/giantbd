'use client';

import { StockOut } from '@/types/inventory';
import { formatDate, formatNumber } from '@/lib/utils';
import { X, Printer, Boxes, CheckCircle2 } from 'lucide-react';

interface ChallanPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  challan?: StockOut | null;
}

export function ChallanPdfModal({
  isOpen,
  onClose,
  challan,
}: ChallanPdfModalProps) {
  if (!isOpen || !challan) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalPairs =
    challan.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) ||
    challan.totalQuantity ||
    0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs no-print"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl my-8">
        {/* Top Modal Controls (No-print) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6 no-print">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Official Delivery Challan Document
            </h3>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
              {challan.challanNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Official Challan</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE OFFICIAL CHALLAN DOCUMENT */}
        <div className="printable-area border border-slate-300 rounded-xl p-8 bg-white text-slate-900 space-y-6">
          {/* Header Banner */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
                  <Boxes className="h-4 w-4" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  GIANT BD
                </h1>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Commercial & Warehouse Management Division
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Industrial Zone, Gazipur, Bangladesh • Phone: +880 1700-000000
              </p>
            </div>

            <div className="text-right">
              <div className="inline-block rounded-md bg-slate-100 px-3 py-1 text-xs font-black tracking-wider uppercase text-slate-900 border border-slate-300">
                DELIVERY CHALLAN
              </div>
              <div className="font-mono text-sm font-bold text-slate-900 mt-2">
                {challan.challanNumber}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Date: {formatDate(challan.dispatchDate)}
              </div>
            </div>
          </div>

          {/* Customer & Shipment Details Grid */}
          <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                Consignee / Buyer:
              </span>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {challan.buyer?.name || challan.po?.buyer?.name || 'Direct Customer'}
              </p>
              {(challan.buyer?.address || challan.destination) && (
                <p className="text-slate-600 mt-0.5">
                  {challan.destination || challan.buyer?.address}
                </p>
              )}
              {challan.buyer?.phone && (
                <p className="text-slate-500 mt-0.5">Contact: {challan.buyer.phone}</p>
              )}
            </div>

            <div className="space-y-1">
              <div>
                <span className="font-bold text-slate-500">Dispatch Type: </span>
                <span className="font-bold text-slate-900 uppercase">
                  {challan.type.replace(/_/g, ' ')}
                </span>
              </div>
              {challan.po && (
                <div>
                  <span className="font-bold text-slate-500">Purchase Order: </span>
                  <span className="font-mono font-bold text-blue-700">
                    {challan.po.poNumber}
                  </span>
                </div>
              )}
              <div>
                <span className="font-bold text-slate-500">Status: </span>
                <span className="font-bold text-emerald-700 uppercase">
                  {challan.status}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 font-bold uppercase tracking-wider text-slate-600 text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 w-12 text-center">#</th>
                  <th className="px-4 py-2.5">SKU & Item Description</th>
                  <th className="px-4 py-2.5">Color</th>
                  <th className="px-4 py-2.5">Size</th>
                  <th className="px-4 py-2.5">Gender</th>
                  <th className="px-4 py-2.5 text-right">Dispatched Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {challan.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-center text-slate-400 font-bold">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2 font-bold">
                      <span className="font-mono">{item.variantProduct?.sku}</span>
                      <span className="block text-[11px] font-normal text-slate-500">
                        {item.variantProduct?.masterProduct?.name || item.variantProduct?.name}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {item.variantProduct?.color?.name || '—'}
                    </td>
                    <td className="px-4 py-2 font-bold">
                      Size {item.variantProduct?.size}
                    </td>
                    <td className="px-4 py-2 uppercase text-[10px] text-slate-500">
                      {item.variantProduct?.gender}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-sm text-slate-900">
                      {formatNumber(item.quantity)} pairs
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-900 bg-slate-50 font-bold text-xs">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right uppercase tracking-wider">
                    Total Dispatched Volume:
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-extrabold text-blue-700">
                    {formatNumber(totalPairs)} pairs
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Remarks */}
          {challan.note && (
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <strong className="font-semibold text-slate-800">Instructions:</strong> {challan.note}
            </div>
          )}

          {/* Signatures & Acknowledgment Block */}
          <div className="pt-8 grid grid-cols-2 gap-12 text-xs">
            {/* Issuer Signature */}
            <div className="text-center space-y-2 border-t border-slate-300 pt-3">
              {challan.issuer?.signature ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/${challan.issuer.signature}`}
                  alt="Issuer Signature"
                  className="h-10 mx-auto object-contain mb-1"
                />
              ) : (
                <div className="h-10 flex items-center justify-center font-serif italic text-slate-400">
                  {challan.issuer?.name || 'Giant BD Warehouse Staff'}
                </div>
              )}
              <p className="font-bold text-slate-900">{challan.issuer?.name || 'Authorized Officer'}</p>
              <p className="text-[10px] text-slate-400">Prepared & Issued By (Giant BD)</p>
            </div>

            {/* Receiver Acknowledgment */}
            <div className="text-center space-y-2 border-t border-slate-300 pt-3">
              <div className="h-10 flex items-center justify-center text-slate-300 text-[10px]">
                [ Receiver Signature & Seal ]
              </div>
              <p className="font-bold text-slate-900">Received in Good Order & Condition</p>
              <p className="text-[10px] text-slate-400">Customer Representative Signature & Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
