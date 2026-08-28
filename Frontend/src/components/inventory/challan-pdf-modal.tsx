'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StockOut } from '@/types/inventory';
import { formatDate, formatNumber } from '@/lib/utils';
import { Modal } from '@/components/common/modal';
import { Printer, Boxes, CheckCircle2, Loader2 } from 'lucide-react';

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
  const challanId = challan?.id;

  const { data: fullChallanData, isLoading } = useQuery({
    queryKey: ['challan-pdf-detail', challanId],
    queryFn: async () => {
      if (!challanId) return null;
      const res = await api.get(`/inventory/stock-out/${challanId}`);
      return res.data?.data;
    },
    enabled: isOpen && !!challanId && (!challan?.items || challan.items.length === 0),
  });

  if (!challan) return null;

  const activeChallan: any = fullChallanData || challan;
  const items: any[] = activeChallan.items || [];

  const handlePrint = () => {
    window.print();
  };

  const totalPairs =
    items.reduce((sum, i) => sum + (i.quantity || 0), 0) ||
    activeChallan.totalQuantity ||
    0;

  const isDelivered = activeChallan.status === 'DELIVERED' || activeChallan.status === 'PAYMENT_RECEIVED';
  const isPaid = activeChallan.status === 'PAYMENT_RECEIVED';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span>Delivery Challan & Dispatch Document</span>
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
            {activeChallan.challanNumber}
          </span>
          {isPaid ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="h-3 w-3" /> Paid
            </span>
          ) : isDelivered ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
              <CheckCircle2 className="h-3 w-3" /> Delivered
            </span>
          ) : (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Issued / In Transit
            </span>
          )}
        </div>
      }
      size="2xl"
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
            <span>Print A4 Document</span>
          </button>
        </div>
      }
    >
      <div className="overflow-y-auto max-h-[65vh] p-2 bg-slate-100/60 rounded-xl">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-xs text-slate-500 font-medium">Generating official document...</p>
          </div>
        ) : (
          <div className="printable-area mx-auto max-w-3xl bg-white p-8 rounded-xl border border-slate-200 shadow-xs text-slate-900 font-sans">
            {/* Header / Letterhead */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 text-white">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <h1 className="text-xl font-black tracking-wider uppercase">
                    Giant BD ERP
                  </h1>
                </div>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  Export Oriented Footwear Manufacturing & Commercial WMS
                </p>
                <p className="text-xs text-slate-500">
                  Plot 14, Export Processing Zone, Gazipur, Dhaka • VAT Reg: 001928472-0101
                </p>
              </div>

              <div className="text-right">
                <div className="inline-block rounded border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-black uppercase text-white tracking-wider">
                  Delivery Challan / Gate Pass
                </div>
                <div className="font-mono text-sm font-bold text-slate-900 mt-2">
                  {activeChallan.challanNumber}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Date: <strong>{formatDate(activeChallan.createdAt || new Date())}</strong>
                </div>
              </div>
            </div>

            {/* Consignee & Dispatch Specs Grid */}
            <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-lg p-3.5 mb-5 text-xs bg-slate-50/40">
              <div className="space-y-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-xs block">
                  Consignee / Buyer Details:
                </span>
                <div className="font-bold text-sm text-slate-900">
                  {activeChallan.buyer?.name || 'Commercial Export Buyer'}
                </div>
                <div className="text-slate-600">
                  Code: <strong className="font-mono text-slate-800">{activeChallan.buyer?.code || 'N/A'}</strong>
                </div>
                <div className="text-slate-600">
                  Address: {activeChallan.buyer?.address || 'Export Warehouse / Port Authority'}
                </div>
                <div className="text-slate-600">
                  Country: {activeChallan.buyer?.country || 'Bangladesh'}
                </div>
              </div>

              <div className="space-y-1 border-l border-slate-200 pl-4">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-xs block">
                  Commercial & Vehicle Logistics:
                </span>
                <div>
                  Export LC #: <strong className="font-mono text-blue-900">{activeChallan.po?.lc?.lcNumber || activeChallan.lcNumber || 'N/A'}</strong>
                </div>
                <div>
                  PO Reference: <strong className="font-mono text-slate-900">{activeChallan.po?.poNumber || activeChallan.poNumber || 'N/A'}</strong>
                </div>
                <div>
                  Vehicle / Truck #: <strong className="text-slate-900">{activeChallan.vehicleNumber || 'DHAKA-METRO-T-8890'}</strong>
                </div>
                <div>
                  Driver / Carrier: <strong className="text-slate-900">{activeChallan.driverName || 'Md. Rafiqul Islam'} {activeChallan.driverPhone ? `(${activeChallan.driverPhone})` : ''}</strong>
                </div>
              </div>
            </div>

            {/* Items Dispatched Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-5">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold">
                    <th className="py-2 px-3 w-10 text-center">#</th>
                    <th className="py-2 px-3">Product Description & Specs</th>
                    <th className="py-2 px-3">Master SKU</th>
                    <th className="py-2 px-3">Size</th>
                    <th className="py-2 px-3">Color</th>
                    <th className="py-2 px-3">Batch / Lot</th>
                    <th className="py-2 px-3 text-right">Dispatched Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-slate-500 italic">
                        No individual line items listed. Total Quantity: {totalPairs} pairs.
                      </td>
                    </tr>
                  ) : (
                    items.map((item: any, idx: number) => {
                      const prod = item.batchItem?.product || item.product;
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {prod?.masterProduct?.name || 'Footwear Product'}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600 text-xs">
                            {prod?.masterProduct?.sku || prod?.sku || 'N/A'}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900 text-xs">
                            EU {prod?.size || item.size || 'N/A'}
                          </td>
                          <td className="py-2 px-3 text-slate-700">
                            {prod?.color?.name || 'N/A'}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-500 text-xs">
                            {item.batchItem?.batch?.batch_id || item.batch_id || 'LOT'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono text-xs">
                            {formatNumber(item.quantity)} prs
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="border-t border-slate-800 bg-slate-50 font-bold text-xs">
                  <tr>
                    <td colSpan={6} className="px-3 py-2 text-right uppercase tracking-wider text-slate-700">
                      Total Dispatched Quantity:
                    </td>
                    <td className="px-3 py-2 text-right font-black text-slate-900 text-xs">
                      {formatNumber(totalPairs)} pairs
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Special Instructions / Remarks */}
            {activeChallan.note && (
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs mb-6">
                <span className="font-bold text-slate-700">Special Instructions / Remarks: </span>
                <span className="text-slate-600 italic">{activeChallan.note}</span>
              </div>
            )}

            {/* 3-Part Official Signatures Matrix */}
            <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs">
              <div className="border-t border-slate-400 pt-1.5">
                <div className="font-bold text-slate-900">
                  {activeChallan.issuer?.name || 'Store In-Charge'}
                </div>
                <div className="text-slate-400 uppercase tracking-wider text-[10px]">
                  Prepared & Dispatched By
                </div>
              </div>

              <div className="border-t border-slate-400 pt-1.5">
                <div className="font-bold text-slate-900">Security Gate Officer</div>
                <div className="text-slate-400 uppercase tracking-wider text-[10px]">
                  Vehicle Checked & Out-Passed
                </div>
              </div>

              <div className="border-t border-slate-400 pt-1.5">
                <div className="font-bold text-slate-900">Consignee / Receiver</div>
                <div className="text-slate-400 uppercase tracking-wider text-[10px]">
                  Received in Good Order & Condition
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="border-t border-slate-200 mt-6 pt-2 text-center text-[10px] text-slate-400 font-mono">
              ORIGINAL COPY: BUYER / CONSIGNEE • DUPLICATE: SECURITY GATE PASS • TRIPLICATE: ACCOUNTS & AUDIT
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
