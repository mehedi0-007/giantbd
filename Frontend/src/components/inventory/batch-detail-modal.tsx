'use client';

import React from 'react';
import { formatDate, formatNumber, calculateBatchAge } from '@/lib/utils';
import { Modal } from '@/components/common/modal';
import { Boxes, Calendar, FileText, MapPin, Tag, ShieldCheck, Printer } from 'lucide-react';

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
  if (!batch) return null;

  const items: any[] = batch.batchItems || [];
  const totalReceived = items.reduce((sum, i) => sum + (i.receivedQty || 0), 0);
  const totalAvailable = items.reduce((sum, i) => sum + (i.availableQty || 0), 0);
  const totalPackets = items.reduce((sum, i) => sum + (i.packetCount || 0), 0);
  const age = calculateBatchAge(batch.productionDate);
  const firstProduct = items[0]?.product;
  const colorName = firstProduct?.color?.name || batch.color?.name || 'Color N/A';
  const colorCode = firstProduct?.color?.code || batch.color?.code;
  const gender = firstProduct?.gender || batch.gender || 'MALE';
  const materialName = firstProduct?.masterProduct?.material?.name || 'Standard Material';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<Boxes className="h-5 w-5" />}
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{batch.batch_id || batch.batch_number || 'Batch Details'}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 uppercase">
            {gender}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${age.badgeClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${age.dotClass}`} />
            <span>{age.label}</span>
          </span>
        </div>
      }
      description={
        <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5">
          <div className="flex items-center gap-1">
            {colorCode && (
              <span
                className="h-2.5 w-2.5 rounded-full border border-slate-300 shadow-2xs shrink-0"
                style={{ backgroundColor: colorCode }}
              />
            )}
            <span className="font-semibold text-slate-800">{colorName}</span>
          </div>
          <span className="text-slate-300">•</span>
          <span className="font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 text-xs">
            {materialName}
          </span>
        </div>
      }
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          {onPrintSticker && (
            <button
              type="button"
              onClick={() => onPrintSticker(batch)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer min-h-[40px]"
            >
              <Printer className="h-4 w-4" />
              <span>Print Sticker</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer ml-auto min-h-[40px]"
          >
            Close Details
          </button>
        </div>
      }
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {/* KPI Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
            <span className="text-xs font-semibold text-slate-500 block">Initial Receipt</span>
            <span className="text-base font-extrabold text-slate-900">{formatNumber(totalReceived)} prs</span>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
            <span className="text-xs font-semibold text-emerald-700 block">Available Stock</span>
            <span className="text-base font-extrabold text-emerald-900">{formatNumber(totalAvailable)} prs</span>
          </div>
          <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3">
            <span className="text-xs font-semibold text-purple-700 block">Total Cartons / Bags</span>
            <span className="text-base font-extrabold text-purple-900">{formatNumber(totalPackets)} pkts</span>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3">
            <span className="text-xs font-semibold text-blue-700 block">Unique Sizes</span>
            <span className="text-base font-extrabold text-blue-900">{items.length} Sizes</span>
          </div>
        </div>

        {/* Master Product & Lot Specs */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Manufacturing & Commercial Traceability
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-500 block text-xs">Production Date</span>
                <strong className="text-slate-800">{formatDate(batch.productionDate)}</strong>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-500 block text-xs">Expiration Date</span>
                <strong className="text-slate-800">{batch.expirationDate ? formatDate(batch.expirationDate) : 'Indefinite (None)'}</strong>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Tag className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-500 block text-xs">Purchase Order</span>
                <strong className="text-blue-700 font-mono">{batch.po?.poNumber || batch.poNumber || 'N/A'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Batch Items Size Breakdown Table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Size Breakdown & Warehouse Placement ({items.length})
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Variant SKU</th>
                  <th className="py-2.5 px-3 text-right">Avail / Rcvd</th>
                  <th className="py-2.5 px-3 text-right">Packets</th>
                  <th className="py-2.5 px-3">Assigned Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-extrabold text-slate-900 font-mono">
                      EU {item.product?.size || item.size || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {item.product?.sku || 'SKU-N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-bold text-emerald-700">{formatNumber(item.availableQty)}</span>
                      <span className="text-slate-400"> / {formatNumber(item.receivedQty)} prs</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700">
                      {item.packetCount || 1} pkts ({item.itemsPerPacket || 1}/pkt)
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="font-semibold text-slate-800">
                          {formatLocationName(item.location)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
