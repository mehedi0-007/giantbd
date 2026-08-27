'use client';

import { formatDate, formatNumber, calculateBatchAge } from '@/lib/utils';
import { X, Boxes, Calendar, FileText, MapPin, Tag, ArrowRight, ShieldCheck, Printer } from 'lucide-react';

interface BatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: any | null;
  onPrintSticker?: (batch: any) => void;
}

const formatLocationName = (loc: any) => {
  if (!loc) return 'Unassigned';
  const parts: string[] = [];
  if (loc.warehouse?.name) parts.push(loc.warehouse.name);
  if (loc.zone?.name) parts.push(loc.zone.name);
  if (loc.subZone?.name) parts.push(loc.subZone.name);
  if (loc.rack?.name) parts.push(loc.rack.name);
  else if (loc.name && !loc.name.startsWith('LOC-')) parts.push(loc.name);

  return parts.length > 0 ? parts.join(' • ') : loc.name || loc.code || 'Unassigned';
};

export function BatchDetailModal({
  isOpen,
  onClose,
  batch,
  onPrintSticker,
}: BatchDetailModalProps) {
  if (!isOpen || !batch) return null;

  const items: any[] = batch.batchItems || [];
  const totalReceived = items.reduce((sum, i) => sum + (i.receivedQty || 0), 0);
  const totalAvailable = items.reduce((sum, i) => sum + (i.availableQty || 0), 0);
  const totalPackets = items.reduce((sum, i) => sum + (i.packetCount || 0), 0);
  const age = calculateBatchAge(batch.productionDate);

  const productName = items[0]?.product?.name || batch.masterProduct?.name || 'Footwear Style';
  const colorName = items[0]?.product?.color?.name || batch.color?.name || 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-3xl max-h-[90vh] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 font-mono">
                  {batch.batch_id || batch.batch_number || 'Batch Details'}
                </h3>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  {batch.status || 'ACTIVE'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${age.badgeClass}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${age.dotClass}`} />
                  <span>{age.label}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {productName} • <span className="font-semibold text-slate-700">{colorName}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onPrintSticker && (
              <button
                type="button"
                onClick={() => onPrintSticker(batch)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Sticker</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Available In-Hand</span>
              <div className="text-lg font-bold text-emerald-600 mt-0.5">
                {formatNumber(totalAvailable)} <span className="text-xs font-normal text-slate-500">pairs</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Received</span>
              <div className="text-lg font-bold text-slate-800 mt-0.5">
                {formatNumber(totalReceived)} <span className="text-xs font-normal text-slate-500">pairs</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Cartons</span>
              <div className="text-lg font-bold text-slate-800 mt-0.5">
                {formatNumber(totalPackets)} <span className="text-xs font-normal text-slate-500">ctns</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Age & Production</span>
              <div className="text-xs font-bold text-slate-800 mt-0.5">
                {formatDate(batch.productionDate)}
              </div>
              <div className="mt-1">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold rounded border ${age.badgeClass}`}>
                  <span className={`h-1 w-1 rounded-full ${age.dotClass}`} />
                  <span>{age.label}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Reference Details */}
          {(batch.po || batch.expirationDate || batch.note) && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-2 text-xs">
              <div className="font-bold text-slate-900 mb-2">Commercial & Storage References</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                {batch.po && (
                  <div>
                    <span className="text-slate-400">Purchase Order:</span>{' '}
                    <span className="font-mono font-semibold text-blue-600">{batch.po.poNumber}</span>
                    {batch.po.buyer && (
                      <span className="text-slate-500"> ({batch.po.buyer.name})</span>
                    )}
                  </div>
                )}
                {batch.expirationDate && (
                  <div>
                    <span className="text-slate-400">Expiration / Warranty Date:</span>{' '}
                    <span className="font-medium text-slate-800">{formatDate(batch.expirationDate)}</span>
                  </div>
                )}
                {batch.note && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400">Receiver Notes:</span>{' '}
                    <span className="italic text-slate-700">{batch.note}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items Breakdown Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Size Breakdown & Storage Locations ({items.length} sizes)
              </h4>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Size / SKU</th>
                    <th className="px-4 py-2.5">In-Hand / Total</th>
                    <th className="px-4 py-2.5">Cartons (Ctns)</th>
                    <th className="px-4 py-2.5">Storage Location</th>
                    <th className="px-4 py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5">
                        <div className="font-bold text-slate-900">
                          Size {item.product?.size || item.size || 'N/A'}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {item.product?.sku || item.sku || 'SKU-000'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-bold text-emerald-700">
                          {item.availableQty ?? item.receivedQty ?? 0}
                        </span>
                        <span className="text-slate-400"> / {item.receivedQty || 0} pairs</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-slate-800">{item.packetCount || 1} ctns</span>
                        <span className="text-[10px] text-slate-400 block">
                          ({item.itemsPerPacket || 1} prs/ctn)
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {item.location ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold bg-slate-100/90 border border-slate-200/80 rounded-md px-2.5 py-1 w-fit">
                            <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            <span>{formatLocationName(item.location)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          {item.status || 'AVAILABLE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 pt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
