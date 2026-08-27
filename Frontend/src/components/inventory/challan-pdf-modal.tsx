'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { StockOut } from '@/types/inventory';
import { formatDate, formatNumber } from '@/lib/utils';
import { X, Printer, Boxes, CheckCircle2, Loader2, MapPin, ShieldCheck, DollarSign } from 'lucide-react';

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

  // Fetch full details if items array is missing/empty
  const { data: fullChallanData, isLoading } = useQuery({
    queryKey: ['challan-pdf-detail', challanId],
    queryFn: async () => {
      if (!challanId) return null;
      const res = await api.get(`/inventory/stock-out/${challanId}`);
      return res.data?.data;
    },
    enabled: isOpen && !!challanId && (!challan?.items || challan.items.length === 0),
  });

  if (!isOpen || !challan) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs no-print"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl my-6 flex flex-col max-h-[92vh]">
        {/* Top Controls Bar (No-Print) */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-slate-50/80 rounded-t-2xl shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold text-slate-900">
              Delivery Challan & Dispatch Document
            </h3>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              {activeChallan.challanNumber}
            </span>
            {isPaid ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> Paid & Settled
              </span>
            ) : isDelivered ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                <CheckCircle2 className="h-3 w-3" /> Delivered
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Issued / In Transit
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print A4 Document</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-xs">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600 mb-2" />
              <p className="text-xs font-medium text-slate-500">Loading complete document line items...</p>
            </div>
          ) : (
            /* A4 FORMATTED ENTERPRISE DOCUMENT */
            <div className="printable-area mx-auto max-w-3xl bg-white p-8 sm:p-10 shadow-xs border border-slate-200 text-slate-800 text-[11px] leading-relaxed rounded-lg">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-900 text-white font-bold text-xs">
                      G
                    </div>
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase">
                      GIANT BD ENTERPRISE
                    </h1>
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Commercial & Footwear Manufacturing Division
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Plot 104-108, Industrial Area, Gazipur, Bangladesh • info@giantbd.com
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block border border-slate-800 bg-slate-50 px-2.5 py-0.5 text-[11px] font-black tracking-wider uppercase text-slate-900 rounded">
                    DELIVERY CHALLAN
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-900 mt-1">
                    No: {activeChallan.challanNumber}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Date: {formatDate(activeChallan.dispatchDate)}
                  </div>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-3 rounded border border-slate-200 text-[11px] mb-4">
                <div className="space-y-0.5">
                  <div>
                    <span className="text-slate-500 font-medium">Consignee / Buyer: </span>
                    <strong className="text-slate-900">
                      {activeChallan.buyer?.name || activeChallan.po?.buyer?.name || 'Factory Dispatch'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Destination: </span>
                    <span className="text-slate-800">{activeChallan.destination || 'Chittagong Port / Central Warehouse'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Dispatch Mode: </span>
                    <span className="font-mono font-semibold text-slate-700">{activeChallan.type}</span>
                  </div>
                </div>

                <div className="space-y-0.5 text-right">
                  {activeChallan.po && (
                    <div>
                      <span className="text-slate-500 font-medium">PO Reference: </span>
                      <span className="font-mono font-bold text-blue-700">
                        {activeChallan.po.poNumber}
                      </span>
                    </div>
                  )}
                  {activeChallan.po?.lc && (
                    <div>
                      <span className="text-slate-500 font-medium">Letter of Credit: </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {activeChallan.po.lc.lcNumber}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 font-medium">Fulfillment Status: </span>
                    <strong className="uppercase text-slate-900">{activeChallan.status}</strong>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-300 rounded overflow-hidden mb-4">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] tracking-wider border-b border-slate-300">
                    <tr>
                      <th className="px-3 py-1.5 w-8 text-center">#</th>
                      <th className="px-3 py-1.5">SKU & Item Description</th>
                      <th className="px-3 py-1.5">Color</th>
                      <th className="px-3 py-1.5">Gender</th>
                      <th className="px-3 py-1.5">Size</th>
                      <th className="px-3 py-1.5">Batch / Bin Location</th>
                      <th className="px-3 py-1.5 text-right">Quantity (Pairs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                          No line items recorded.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => {
                        const vp = item.variantProduct || item.product;
                        const bi = item.batchItem;
                        const batchCode = bi?.batch?.batch_id || bi?.batch?.batch_number || '';
                        const locCode = bi?.location?.code || '';

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-1.5 text-center text-slate-400 font-medium">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-1.5">
                              <span className="font-mono font-bold text-slate-900">{vp?.sku || 'SKU-000'}</span>
                              <span className="block text-[10px] text-slate-500">
                                {vp?.masterProduct?.name || vp?.name || 'Footwear Style'}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-slate-600">
                              {vp?.color?.name || '—'}
                            </td>
                            <td className="px-3 py-1.5 uppercase text-[10px] text-slate-600 font-semibold">
                              {vp?.gender || '—'}
                            </td>
                            <td className="px-3 py-1.5 font-bold text-slate-900">
                              Size {vp?.size || '—'}
                            </td>
                            <td className="px-3 py-1.5 font-mono text-[9px] text-slate-600">
                              {batchCode && <div>{batchCode}</div>}
                              {locCode && <div className="text-slate-400">Bin: {locCode}</div>}
                            </td>
                            <td className="px-3 py-1.5 text-right font-bold text-slate-900">
                              {formatNumber(item.quantity)} prs
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="border-t border-slate-800 bg-slate-50 font-bold text-[11px]">
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
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[10px] mb-6">
                  <span className="font-bold text-slate-700">Special Instructions / Remarks: </span>
                  <span className="text-slate-600 italic">{activeChallan.note}</span>
                </div>
              )}

              {/* 3-Part Official Signatures Matrix */}
              <div className="grid grid-cols-3 gap-6 pt-8 text-center text-[10px]">
                <div className="border-t border-slate-400 pt-1.5">
                  <div className="font-bold text-slate-900">
                    {activeChallan.issuer?.name || 'Store In-Charge'}
                  </div>
                  <div className="text-slate-400 uppercase tracking-wider">
                    Prepared & Dispatched By
                  </div>
                </div>

                <div className="border-t border-slate-400 pt-1.5">
                  <div className="font-bold text-slate-900">Security Gate Officer</div>
                  <div className="text-slate-400 uppercase tracking-wider">
                    Vehicle Checked & Out-Passed
                  </div>
                </div>

                <div className="border-t border-slate-400 pt-1.5">
                  <div className="font-bold text-slate-900">Consignee / Receiver</div>
                  <div className="text-slate-400 uppercase tracking-wider">
                    Received in Good Order & Condition
                  </div>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="border-t border-slate-200 mt-6 pt-2 text-center text-[8px] text-slate-400 font-mono">
                ORIGINAL COPY: BUYER / CONSIGNEE • DUPLICATE: SECURITY GATE PASS • TRIPLICATE: ACCOUNTS & AUDIT
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
