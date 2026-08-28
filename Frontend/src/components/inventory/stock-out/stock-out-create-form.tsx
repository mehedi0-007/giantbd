'use client';

import React from 'react';
import { PO } from '@/types/commercial';
import { formatDate, formatNumber, calculateBatchAge } from '@/lib/utils';
import {
  Truck,
  Boxes,
  MapPin,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface StockOutCreateFormProps {
  lcs: any[];
  pos: PO[];
  products: any[];
  availableColors: any[];
  availableGenders: string[];
  selectedLcId: string;
  onLcChange: (id: string) => void;
  selectedPoId: string;
  onPoChange: (id: string) => void;
  selectedProductId: string;
  onProductChange: (id: string) => void;
  selectedColorId: string;
  onColorChange: (id: string) => void;
  selectedGender: string;
  onGenderChange: (gender: string) => void;
  destination: string;
  onDestinationChange: (dest: string) => void;
  dispatchDate: string;
  onDispatchDateChange: (date: string) => void;
  note: string;
  onNoteChange: (note: string) => void;
  formError: string;
  isCreating: boolean;
  loadingProductDetails: boolean;
  loadingBatches: boolean;
  availableBatches: any[];
  expandedBatchIds: Record<string, boolean>;
  onToggleBatchExpand: (id: string) => void;
  selectedItemQuantities: Record<string, number>;
  onItemQtyChange: (batchItemId: string, maxAvailable: number, qty: number) => void;
  onToggleSelectBatch: (batch: any) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function StockOutCreateForm({
  lcs,
  pos,
  products,
  availableColors,
  availableGenders,
  selectedLcId,
  onLcChange,
  selectedPoId,
  onPoChange,
  selectedProductId,
  onProductChange,
  selectedColorId,
  onColorChange,
  selectedGender,
  onGenderChange,
  destination,
  onDestinationChange,
  dispatchDate,
  onDispatchDateChange,
  note,
  onNoteChange,
  formError,
  isCreating,
  loadingProductDetails,
  loadingBatches,
  availableBatches,
  expandedBatchIds,
  onToggleBatchExpand,
  selectedItemQuantities,
  onItemQtyChange,
  onToggleSelectBatch,
  onCancel,
  onSubmit,
}: StockOutCreateFormProps) {
  const selectedLc = lcs.find((l) => l.id === selectedLcId);
  const availablePos = selectedLcId
    ? pos.filter((p) => p.lcId === selectedLcId || p.lc?.id === selectedLcId)
    : pos;

  const isHierarchyComplete = Boolean(
    selectedLcId && selectedPoId && selectedProductId && selectedColorId && selectedGender,
  );

  const totalSelectedPairs = Object.values(selectedItemQuantities).reduce((sum, q) => sum + q, 0);
  const totalSelectedItemsCount = Object.keys(selectedItemQuantities).length;

  const formatLocationName = (loc: any) => {
    if (!loc) return 'Unassigned';
    const parts = [];
    if (loc.warehouse?.name) parts.push(loc.warehouse.name);
    if (loc.rack?.name) parts.push(loc.rack.name);
    parts.push(loc.name || loc.code);
    return parts.join(' • ');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-bold text-slate-900">
            Dispatch Shipment & Generate Delivery Challan
          </h2>
          <p className="text-xs text-slate-500">
            Select available production batches, pick exact size quantities to load, and generate official challan documents.
          </p>
        </div>

        {formError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-medium"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{formError}</span>
          </div>
        )}

        {/* Cascading Hierarchical Chain: LC -> PO -> Master Product -> Color -> Gender */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Select LC */}
          <div>
            <label htmlFor="select-dispatch-lc" className="mb-1 block text-xs font-semibold text-slate-700">
              1. Letter of Credit (LC) <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="select-dispatch-lc"
              required
              aria-required="true"
              value={selectedLcId}
              onChange={(e) => onLcChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden min-h-[40px]"
            >
              <option value="">Select Letter of Credit (LC)</option>
              {lcs.map((lc) => (
                <option key={lc.id} value={lc.id}>
                  {lc.lcNumber} (Buyer: {lc.buyer?.name || 'N/A'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Select PO */}
          <div>
            <label htmlFor="select-dispatch-po" className="mb-1 block text-xs font-semibold text-slate-700">
              2. Purchase Order Contract <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="select-dispatch-po"
              required
              aria-required="true"
              disabled={!selectedLcId || availablePos.length === 0}
              value={selectedPoId}
              onChange={(e) => onPoChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400 min-h-[40px]"
            >
              <option value="">
                {!selectedLcId
                  ? '⚠️ First select an LC'
                  : availablePos.length === 0
                  ? 'No POs attached to this LC'
                  : 'Select Purchase Order (PO)'}
              </option>
              {availablePos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.poNumber} ({p.totalQuantity} pairs total)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Auto-populated Buyer & Contract Card */}
        {selectedLc?.buyer && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-900">
                🏢 Buyer: {selectedLc.buyer.name}
              </span>
              <span className="font-mono text-[10px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-700">
                {selectedLc.buyer.code}
              </span>
            </div>
            <div className="text-[11px] text-blue-700/80 flex items-center gap-3">
              <span>Country: {selectedLc.buyer.country || 'N/A'}</span>
              {selectedLc.amount && (
                <>
                  <span>•</span>
                  <span>
                    Value: {selectedLc.currency || 'USD'} {formatNumber(selectedLc.amount)}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 3, 4, 5: Master Product -> Color -> Gender Cascading Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 3. Master Product */}
          <div>
            <label htmlFor="select-dispatch-product" className="mb-1 block text-xs font-semibold text-slate-700">
              3. Master Product Style <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="select-dispatch-product"
              disabled={!selectedPoId}
              value={selectedProductId}
              onChange={(e) => onProductChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400 min-h-[40px]"
            >
              <option value="">
                {!selectedPoId ? '⚠️ Select a PO first' : 'Select Master Product'}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Color Variation */}
          <div>
            <label htmlFor="select-dispatch-color" className="mb-1 block text-xs font-semibold text-slate-700">
              4. Color Variation <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="select-dispatch-color"
              disabled={!selectedProductId || loadingProductDetails}
              value={selectedColorId}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400 min-h-[40px]"
            >
              <option value="">
                {!selectedProductId
                  ? '⚠️ Select Product first'
                  : loadingProductDetails
                  ? 'Loading colors...'
                  : availableColors.length === 0
                  ? 'No colors configured'
                  : 'Select Color'}
              </option>
              {availableColors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(${c.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Gender Line */}
          <div>
            <label htmlFor="select-dispatch-gender" className="mb-1 block text-xs font-semibold text-slate-700">
              5. Gender Line <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="select-dispatch-gender"
              disabled={!selectedColorId || availableGenders.length === 0}
              value={selectedGender}
              onChange={(e) => onGenderChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400 min-h-[40px]"
            >
              <option value="">
                {!selectedColorId
                  ? '⚠️ Select Color first'
                  : availableGenders.length === 0
                  ? 'No gender lines'
                  : 'Select Gender Line'}
              </option>
              {availableGenders.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* AVAILABLE BATCHES ACCORDION PICKER */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Matching Warehouse Batches & Storage Locations ({availableBatches.length} batches available)
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Select physical batch items and specify dispatch quantities
            </span>
          </div>

          {!isHierarchyComplete ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Boxes className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">
                Awaiting Master Product, Color & Gender Selection
              </h4>
              <p className="text-[11px] text-slate-500 max-w-sm">
                Please select the Letter of Credit, Purchase Order, Master Product Style, Color, and Gender above to reveal available warehouse inventory batches.
              </p>
            </div>
          ) : loadingBatches ? (
            <div className="flex items-center justify-center py-10 rounded-xl border border-slate-100 bg-slate-50/50">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : availableBatches.length === 0 ? (
            <div className="text-center py-10 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 text-xs">
              No active stock batches found matching the selected Style, Color, and Gender.
            </div>
          ) : (
            <div className="space-y-3">
              {availableBatches.map((batch) => {
                const isExpanded = expandedBatchIds[batch.id] !== false; // default expanded
                const items: any[] = (batch.batchItems || []).filter((i: any) => {
                  const p = i.product;
                  const matchProd = p?.masterProductId === selectedProductId || p?.masterProduct?.id === selectedProductId;
                  const matchColor = p?.colorId === selectedColorId || p?.color?.id === selectedColorId;
                  const matchGender = (p?.gender || p?.masterProduct?.gender) === selectedGender;
                  const hasQty = (i.availableQty ?? i.receivedQty ?? 0) > 0;
                  return matchProd && matchColor && matchGender && hasQty;
                });
                const totalAvailable = items.reduce((sum, i) => sum + (i.availableQty ?? i.receivedQty ?? 0), 0);
                const allSelectedInBatch = items.length > 0 && items.every((i) => (selectedItemQuantities[i.id] || 0) > 0);

                const productName = items[0]?.product?.name || batch.masterProduct?.name || 'Footwear Style';
                const colorName = items[0]?.product?.color?.name || batch.color?.name || 'Color N/A';

                return (
                  <div key={batch.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    {/* Batch Header Row */}
                    <div
                      onClick={() => onToggleBatchExpand(batch.id)}
                      className={`flex items-center justify-between p-3.5 cursor-pointer transition select-none flex-wrap gap-2 ${
                        isExpanded ? 'bg-slate-50/80 border-b border-slate-100' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-600 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                          aria-label={isExpanded ? 'Collapse batch details' : 'Expand batch details'}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleBatchExpand(batch.id);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-blue-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelectBatch(batch);
                          }}
                          className="text-blue-600 hover:text-blue-800 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title={allSelectedInBatch ? 'Deselect All in Batch' : 'Select All in Batch'}
                          aria-label={allSelectedInBatch ? 'Deselect all items in this batch' : 'Select all items in this batch'}
                        >
                          {allSelectedInBatch ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300 hover:text-blue-400" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {batch.batch_id || batch.batch_number}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-700">
                              {productName} • <span className="text-blue-600">{colorName}</span>
                            </span>
                            {(() => {
                              const age = calculateBatchAge(batch.productionDate);
                              return (
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold border ${age.badgeClass}`}>
                                  <span className={`h-1 w-1 rounded-full ${age.dotClass}`} />
                                  <span>{age.label}</span>
                                </span>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>Produced: {formatDate(batch.productionDate)}</span>
                            {batch.po && (
                              <>
                                <span>•</span>
                                <span>PO: {batch.po.poNumber}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">In-Hand</span>
                          <span className="font-bold text-emerald-700 text-xs">
                            {formatNumber(totalAvailable)} prs
                          </span>
                        </div>
                        <span className="text-[11px] rounded-md bg-blue-50 text-blue-700 px-2 py-0.5 font-bold">
                          {items.length} Sizes
                        </span>
                      </div>
                    </div>

                    {/* Nested Size Items Matrix */}
                    {isExpanded && (
                      <div className="p-3 bg-white overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[500px]">
                          <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-1">
                            <tr>
                              <th className="pb-2 w-8"></th>
                              <th className="pb-2">Size / SKU</th>
                              <th className="pb-2">Storage Location</th>
                              <th className="pb-2 text-right">Available Stock</th>
                              <th className="pb-2 text-right w-36">Dispatch Quantity</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {items.map((item) => {
                              const maxAvail = item.availableQty ?? item.receivedQty ?? 0;
                              const currentQty = selectedItemQuantities[item.id] || 0;
                              const isSelected = currentQty > 0;

                              return (
                                <tr key={item.id} className={`hover:bg-slate-50/50 ${isSelected ? 'bg-blue-50/30' : ''}`}>
                                  <td className="py-2.5">
                                    <input
                                      type="checkbox"
                                      aria-label={`Select size ${item.product?.size || item.size}`}
                                      checked={isSelected}
                                      disabled={maxAvail <= 0}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          onItemQtyChange(item.id, maxAvail, maxAvail);
                                        } else {
                                          onItemQtyChange(item.id, maxAvail, 0);
                                        }
                                      }}
                                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="py-2.5">
                                    <span className="font-bold text-slate-900">
                                      Size {item.product?.size || item.size || 'N/A'}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-400 block">
                                      {item.product?.sku || item.sku}
                                    </span>
                                  </td>
                                  <td className="py-2.5">
                                    {item.location ? (
                                      <div className="flex items-center gap-1.5 text-[11px] text-slate-800 font-semibold bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 w-fit">
                                        <MapPin className="h-3 w-3 text-blue-600 shrink-0" />
                                        <span>{formatLocationName(item.location)}</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px]">Unassigned Location</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 text-right font-bold text-emerald-700">
                                    {formatNumber(maxAvail)} prs
                                  </td>
                                  <td className="py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <input
                                        type="number"
                                        aria-label={`Dispatch quantity for size ${item.product?.size || item.size}`}
                                        min={0}
                                        max={maxAvail}
                                        value={currentQty || ''}
                                        placeholder="0"
                                        onChange={(e) =>
                                          onItemQtyChange(item.id, maxAvail, Number(e.target.value) || 0)
                                        }
                                        className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs text-right font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden min-h-[36px]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => onItemQtyChange(item.id, maxAvail, maxAvail)}
                                        className="rounded-lg bg-slate-100 px-2 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer min-h-[36px]"
                                      >
                                        Max
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Destination & Dispatch Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label htmlFor="destination-address-input" className="mb-1 block text-xs font-semibold text-slate-700">
              Delivery Destination / Port Address
            </label>
            <input
              id="destination-address-input"
              type="text"
              value={destination}
              onChange={(e) => onDestinationChange(e.target.value)}
              placeholder="e.g. Chittagong Port / Buyer Central Warehouse"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden min-h-[40px]"
            />
          </div>

          <div>
            <label htmlFor="dispatch-date-input" className="mb-1 block text-xs font-semibold text-slate-700">
              Dispatch Date <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="dispatch-date-input"
              type="date"
              required
              aria-required="true"
              value={dispatchDate}
              onChange={(e) => onDispatchDateChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden min-h-[40px]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="dispatch-remarks-input" className="mb-1 block text-xs font-semibold text-slate-700">
            Challan Remarks & Special Instructions
          </label>
          <textarea
            id="dispatch-remarks-input"
            rows={2}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Driver contact, truck plate number, container seal details..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        {/* Bottom Total Live Summary Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-blue-200 bg-blue-50/60">
          <div>
            <div className="text-xs font-bold text-blue-900">
              Selected for Dispatch:{' '}
              <span className="text-lg font-extrabold text-blue-700">{formatNumber(totalSelectedPairs)} pairs</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Across {totalSelectedItemsCount} batch size items
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-h-[40px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || totalSelectedPairs === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer min-h-[40px]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating Challan...</span>
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4" />
                  <span>Generate Challan ({formatNumber(totalSelectedPairs)} pairs)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
