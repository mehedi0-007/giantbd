import { Status, Gender } from './auth';
import { ProductGender, UnitOfMeasurement, PackingType, MasterProduct, VariantProduct, Color } from './catalog';
import { Buyer, PO } from './commercial';
import { StorageLocation, Warehouse, Rack } from './warehouse';

export type InventoryMovementType =
  | 'RECEIVED'
  | 'SALE'
  | 'TRANSFER'
  | 'RETURN'
  | 'DAMAGE'
  | 'ADJUSTMENT';

export type StockOutType =
  | 'PO_SHIPMENT'
  | 'DIRECT_SALE'
  | 'SAMPLE_DISPATCH'
  | 'DAMAGE_SCRAP'
  | 'INTERNAL_TRANSFER';

export type StockOutStatus =
  | 'ISSUED'
  | 'DELIVERED'
  | 'PAYMENT_RECEIVED'
  | 'CANCELLED';

export interface Batch {
  id: string;
  batch_id: string;
  batch_number?: string | null;
  productionDate: string;
  expirationDate: string;
  poId?: string | null;
  po?: PO | null;
  items?: BatchItem[];
  documents?: Document[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BatchItem {
  id: string;
  batchId: string;
  batch?: Batch;
  productId: string;
  product?: VariantProduct;
  locationId: string;
  location?: StorageLocation;
  availableQty: number;
  reservedQty: number;
  totalQuantity: number;
  itemsPerPacket: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Document {
  id: string;
  path: string;
  name?: string;
  type?: string;
  batchId?: string;
  stockOutId?: string;
}

export interface InventoryMovement {
  id: string;
  type: InventoryMovementType;
  quantity: number;
  inventoryBatchItemId: string;
  inventoryBatchItem?: BatchItem;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  referenceId?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface StockOut {
  id: string;
  challanNumber: string;
  type: StockOutType;
  status: StockOutStatus;
  poId?: string | null;
  po?: PO | null;
  buyerId?: string | null;
  buyer?: Buyer | null;
  destination?: string | null;
  dispatchDate: string;
  note?: string | null;
  receiptDocument?: string | null;
  issuerId?: string;
  issuer?: {
    name: string;
    signature?: string | null;
  };
  items?: StockOutItem[];
  itemsCount?: number;
  totalQuantity?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockOutItem {
  id: string;
  stockOutId: string;
  variantProductId: string;
  variantProduct?: VariantProduct;
  batchItemId: string;
  batchItem?: BatchItem;
  quantity: number;
}

export interface StockInItemPayload {
  variantProductId?: string;
  size?: string;
  gender?: ProductGender;
  colorId?: string;
  receivedQty: number;
  itemsPerPacket?: number;
  locationId: string;
}

export interface StockInPayload {
  masterProductId?: string;
  productionDate: string;
  expirationDate?: string;
  batch_id?: string;
  batch_number?: string;
  poId?: string;
  note?: string;
  defaultLocationId?: string;
  items: StockInItemPayload[];
}
