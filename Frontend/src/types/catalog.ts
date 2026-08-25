import { Status } from './auth';

export type ProductGender =
  | 'MALE'
  | 'LADY'
  | 'KIDS'
  | 'JUNIOR'
  | 'TWIN_JUNIOR';

export type UnitOfMeasurement = 'PAIR' | 'LEFT' | 'RIGHT';

export type PackingType = 'POLY_BAG';

export interface Category {
  id: string;
  name: string;
  status: Status;
  subCategories?: SubCategory[];
  _count?: {
    masterProducts?: number;
    subCategories?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
  category?: Category;
  status: Status;
  _count?: {
    masterProducts?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Color {
  id: string;
  name: string;
  code?: string | null; // Hex color code e.g. #FF0000
  status: Status;
  _count?: {
    variantProducts?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Material {
  id: string;
  name: string;
  status: Status;
  _count?: {
    masterProducts?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface MasterProduct {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  categoryId: string;
  category?: Category;
  subCategoryId?: string | null;
  subCategory?: SubCategory | null;
  materialId?: string | null;
  material?: Material | null;
  status: Status;
  variantProducts?: VariantProduct[];
  _count?: {
    variantProducts?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMasterProductDTO {
  name: string;
  sku: string;
  description?: string;
  categoryId: string;
  subCategoryId?: string;
  materialId?: string;
  status?: Status;
}

export interface VariantProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  picture?: string | null;
  size: string;
  gender: ProductGender;
  colorId: string;
  color?: Color;
  masterProductId: string;
  masterProduct?: MasterProduct;
  categoryId?: string | null;
  category?: Category | null;
  subCategoryId?: string | null;
  subCategory?: SubCategory | null;
  uom: UnitOfMeasurement;
  packingType?: PackingType;
  itemsPerPacket: number;
  costPrice?: number | null;
  sellingPrice?: number | null;
  mrp?: number | null;
  shippableQuantity: number;
  status: Status;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVariantDTO {
  name: string;
  sku: string;
  size: string;
  gender: ProductGender;
  colorId: string;
  masterProductId: string;
  uom?: UnitOfMeasurement;
  itemsPerPacket?: number;
  costPrice?: number;
  sellingPrice?: number;
  mrp?: number;
}

export interface BulkCreateVariantDTO {
  masterProductId: string;
  colorId: string;
  gender: ProductGender;
  uom?: UnitOfMeasurement;
  itemsPerPacket?: number;
  sizes: string[];
}
