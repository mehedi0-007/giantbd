import { Status } from './auth';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  status: Status;
  zones?: Zone[];
  locations?: StorageLocation[];
  _count?: {
    zones?: number;
    locations?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Zone {
  id: string;
  name: string;
  code: string;
  warehouseId: string;
  warehouse?: Warehouse;
  status: Status;
  subZones?: SubZone[];
  locations?: StorageLocation[];
  _count?: {
    subZones?: number;
    locations?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SubZone {
  id: string;
  name: string;
  code: string;
  zoneId: string;
  zone?: Zone;
  status: Status;
  racks?: Rack[];
  locations?: StorageLocation[];
  _count?: {
    racks?: number;
    locations?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Rack {
  id: string;
  name: string;
  code: string;
  subZoneId: string;
  subZone?: SubZone;
  status: Status;
  locations?: StorageLocation[];
  _count?: {
    locations?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface StorageLocation {
  id: string;
  code: string;
  barcode?: string | null;
  warehouseId: string;
  warehouse?: Warehouse;
  zoneId: string;
  zone?: Zone;
  subZoneId: string;
  subZone?: SubZone;
  rackId: string;
  rack?: Rack;
  status: Status;
  _count?: {
    batchItems?: number;
  };
  batchItems?: Array<{
    id: string;
    availableQty: number;
    variantProduct?: {
      name: string;
      sku: string;
      size: string;
    };
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLocationDTO {
  code: string;
  barcode?: string;
  warehouseId: string;
  zoneId: string;
  subZoneId: string;
  rackId: string;
  status?: Status;
}
