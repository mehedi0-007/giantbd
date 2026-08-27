import { Status } from './auth';

export type LCStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'FULFILLED'
  | 'EXPIRED'
  | 'CANCELLED';

export type POStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY_FOR_SHIPMENT'
  | 'PARTIALLY_SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Buyer {
  id: string;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  contactPerson?: string | null;
  status: Status;
  _count?: {
    lcs?: number;
    purchaseOrders?: number;
    stockOuts?: number;
  };
  lcs?: LC[];
  purchaseOrders?: PO[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBuyerDTO {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  contactPerson?: string;
  status?: Status;
}

export interface LC {
  id: string;
  lcNumber: string;
  buyerId: string;
  buyer?: Buyer;
  issueDate?: string | null;
  expiryDate?: string | null;
  shipmentDate?: string | null;
  status: LCStatus;
  remarks?: string | null;
  purchaseOrders?: PO[];
  _count?: {
    purchaseOrders?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLCDTO {
  lcNumber: string;
  buyerId: string;
  issueDate?: string;
  expiryDate?: string;
  shipmentDate?: string;
  status?: LCStatus;
  remarks?: string;
}

export interface POItem {
  id: string;
  poId: string;
  variantProductId: string;
  variantProduct?: {
    id: string;
    name: string;
    sku: string;
    size: string;
    gender: string;
    color?: { name: string; code?: string };
    masterProduct?: { name: string; sku: string };
  };
  quantity: number;
  shippedQuantity: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PO {
  id: string;
  poNumber: string;
  buyerId: string;
  buyer?: Buyer;
  lcId?: string | null;
  lc?: LC | null;
  orderDate: string;
  deliveryDate?: string | null;
  totalQuantity: number;
  status: POStatus;
  remarks?: string | null;
  items?: POItem[];
  _count?: {
    items?: number;
    batches?: number;
    stockOuts?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePODTO {
  poNumber: string;
  lcId: string;
  buyerId?: string;
  orderDate?: string;
  deliveryDate?: string;
  status?: POStatus;
  remarks?: string;
  items?: Array<{
    variantProductId: string;
    quantity: number;
  }>;
}

export interface AddPOItemsDTO {
  items: Array<{
    variantProductId: string;
    quantity: number;
  }>;
}
