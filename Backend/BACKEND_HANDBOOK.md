# 📘 Giant BD — Complete Backend Developer & AI Agent Encyclopedia

> **The Definitive Single-Source-of-Truth for the Giant BD ERP & WMS Backend**  
> *Framework*: NestJS (Express) | *ORM*: Prisma 5+ | *Database*: PostgreSQL  
> *Architecture*: Modular Domain-Driven | *Test Coverage*: 100% (97/97 E2E Tests Passing)  
> *Global API Prefix*: `/api`

---

## 📑 Table of Contents
1. [Core Architectural Pipeline & Middleware](#1-core-architectural-pipeline--middleware)
2. [Complete Database Entities & Schema Reference](#2-complete-database-entities--schema-reference)
3. [Prisma Enums & Domain Constants](#3-prisma-enums--domain-constants)
4. [Authentication, RBAC & Permissions Matrix](#4-authentication-rbac--permissions-matrix)
5. [Complete API Endpoints & Request/Response Catalog](#5-complete-api-endpoints--requestresponse-catalog)
   - 5.1 [Auth & User Management](#51-auth--user-management)
   - 5.2 [Master Data Attributes (Product & Warehouse)](#52-master-data-attributes-product--warehouse)
   - 5.3 [Products & Variants Catalog](#53-products--variants-catalog)
   - 5.4 [Commercial (Buyers, LC & PO)](#54-commercial-buyers-lc--po)
   - 5.5 [Inventory (Stock-In, Batches, Stock Overview, Movements)](#55-inventory-stock-in-batches-stock-overview-movements)
   - 5.6 [Stock-Out (Challans, Status Workflow, Cancellation)](#56-stock-out-challans-status-workflow-cancellation)
6. [Business Logic, Auto-Calculations & State Machines](#6-business-logic-auto-calculations--state-machines)
7. [File Uploads, Storage & Static Serving](#7-file-uploads-storage--static-serving)
8. [Automated E2E Test Suite Reference](#8-automated-e2e-test-suite-reference)
9. [Environment Variables, Setup & Migrations](#9-environment-variables-setup--migrations)

---

## 1. Core Architectural Pipeline & Middleware

```
HTTP Request
  │
  ├──▶ 1. Cookie Parser (`cookieParser()`)
  ├──▶ 2. CORS Guard (`app.enableCors()`) ── [Permits configured FRONTEND_URL or dev localhost]
  ├──▶ 3. Global Prefix (`/api`)
  ├──▶ 4. ValidationPipe (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`, `enableImplicitConversion: true`)
  ├──▶ 5. LoggingInterceptor (`LoggingInterceptor`) ── [Logs Method, URL, Execution Time, Status]
  ├──▶ 6. Authentication & Permissions Guard (`JwtAuthGuard`, `PermissionsGuard`)
  │      └── [SUPER_ADMIN role bypasses all checks; others checked against user.permissions[]]
  ├──▶ 7. Controller & Service Execution (Atomic Prisma Transactions `$transaction`)
  ├──▶ 8. TransformResponseInterceptor (`TransformResponseInterceptor`) ── [Wraps result in standard envelope]
  │      └── { success: true, statusCode: 200/201, data: ..., message?: string }
  └──▶ 9. GlobalExceptionFilter (`GlobalExceptionFilter`) ── [Catches Prisma, HTTP, & Runtime errors]
         └── { success: false, statusCode: 400/401/403/404/409/500, message: string|string[], error: string, timestamp: string, path: string }
```

---

## 2. Complete Database Entities & Schema Reference

### Total Models: 20 Database Tables

| Model | Primary Key | Key Relations & Indexes | Purpose |
|---|---|---|---|
| `User` | `id (cuid)` | `roleId` (`@@index([roleId])`), `email (unique)`, `phone (unique)` | System users, admins, operators |
| `Role` | `id (cuid)` | `name (unique)`, `status` (`@@index([status])`) | User roles (`SUPER_ADMIN`, etc.) |
| `Permission` | `id (cuid)` | `name (unique)`, `module` (`@@index([module])`) | Granular access control permissions |
| `RolePermission`| `[roleId, permissionId]` | Compound PK (`@@id([roleId, permissionId])`) | Many-to-many role-permission mapping |
| `Category` | `id (cuid)` | `name (unique)`, `status` (`@@index([status])`) | Product category hierarchy level 1 |
| `SubCategory` | `id (cuid)` | `[categoryId, name] (unique)`, `categoryId` (`@@index`) | Product category hierarchy level 2 |
| `Material` | `id (cuid)` | `name (unique)`, `status` (`@@index([status])`) | Raw material type (e.g. Leather, Rubber) |
| `Color` | `id (cuid)` | `name (unique)`, `status` (`@@index([status])`) | Product color palette with hex code |
| `MasterProduct` | `id (cuid)` | `sku (unique)`, `categoryId`, `subCategoryId`, `materialId`, `creatorId` | Parent catalog product definition |
| `VariantProduct`| `id (cuid)` | `sku (unique)`, `barcode (unique)`, `masterProductId`, `colorId`, `categoryId`, `subCategoryId`, `creatorId` | Concrete SKU with size, color, gender & inventory count |
| `Warehouse` | `id (cuid)` | `code (unique)`, `status` (`@@index([status])`) | Physical storage building |
| `Zone` | `id (cuid)` | `[warehouseId, code] (unique)`, `warehouseId` (`@@index`) | Floor or building wing |
| `SubZone` | `id (cuid)` | `[zoneId, code] (unique)`, `zoneId` (`@@index`) | Specific area inside a zone |
| `Rack` | `id (cuid)` | `[subZoneId, code] (unique)`, `subZoneId` (`@@index`) | Storage rack structure |
| `StorageLocation`| `id (cuid)` | `code (unique)`, `warehouseId`, `zoneId`, `subZoneId`, `rackId` | Exact bin/shelf slot for barcode scanning |
| `Buyer` | `id (cuid)` | `code (unique)`, `status`, `country` (`@@index`) | Commercial client/customer entity |
| `LC` | `id (cuid)` | `lcNumber (unique)`, `buyerId`, `status`, `expiryDate`, `shipmentDate` | Letter of Credit commercial instrument |
| `PO` | `id (cuid)` | `poNumber (unique)`, `buyerId`, `lcId`, `status`, `orderDate`, `deliveryDate` | Customer Purchase Order |
| `POItem` | `id (cuid)` | `poId`, `variantProductId` (`@@index([poId])`) | Line items on a PO with ordered & shipped counts |
| `Batch` | `id (cuid)` | `[batch_id, productionDate] (unique)`, `poId`, `expirationDate` | Physical manufacturing or stock-in lot |
| `BatchItem` | `id (cuid)` | `[productId, batchId, locationId] (unique)` | Inventory allocation per variant in a bin |
| `InventoryMovement`| `id (cuid)`| `inventoryBatchItemId`, `type`, `createdAt` (`@@index`) | Immutable double-entry audit ledger |
| `StockOut` | `id (cuid)` | `challanNumber (unique)`, `poId`, `buyerId`, `status`, `type`, `dispatchDate` | Official dispatch & delivery challan |
| `StockOutItem` | `id (cuid)` | `stockOutId`, `variantProductId`, `batchItemId` | Line item dispatched on a challan |
| `Document` | `id (cuid)` | `batchId`, `stockOutId` (`@@index`) | Attached invoices, receipts, and proofs |

---

## 3. Prisma Enums & Domain Constants

```prisma
enum Status {
  ACTIVE
  INACTIVE
  PENDING
  DELETED
}

enum Gender {
  MALE
  FEMALE
}

enum PRODUCT_GENDER {
  MALE
  LADY
  KIDS
  JUNIOR
  TWIN_JUNIOR
}

enum UnitOfMeasurement {
  PAIR
  LEFT
  RIGHT
}

enum PackingType {
  POLY_BAG
}

enum InventoryMovementType {
  RECEIVED    // Stock-in entry
  SALE        // Dispatched via PO or Direct Sale
  TRANSFER    // Internal warehouse transfer
  RETURN      // Cancelled challan or customer return
  DAMAGE      // Scrapped / damaged stock deduction
  ADJUSTMENT  // Manual stock reconciliation
}

enum LCStatus {
  OPEN
  IN_PROGRESS
  FULFILLED
  EXPIRED
  CANCELLED
}

enum POStatus {
  DRAFT
  CONFIRMED
  IN_PRODUCTION
  READY_FOR_SHIPMENT
  PARTIALLY_SHIPPED
  COMPLETED
  CANCELLED
}

enum StockOutType {
  PO_SHIPMENT
  DIRECT_SALE
  SAMPLE_DISPATCH
  DAMAGE_SCRAP
  INTERNAL_TRANSFER
}

enum StockOutStatus {
  ISSUED            // Challan created, stock deducted from inventory
  DELIVERED         // Delivered to buyer / destination (receipt document attached)
  PAYMENT_RECEIVED  // Payment collected (final state)
  CANCELLED         // Voided challan (inventory atomically restored)
}
```

---

## 4. Authentication, RBAC & Permissions Matrix

### JWT Dual-Token Security Engine
1. **Access Token**: Sent as `Authorization: Bearer <token>` in header. Contains `{ sub: userId }`. Short lifespan.
2. **Refresh Token**: Stored in `httpOnly`, `sameSite: 'lax'`, `path: '/'` cookie named `refreshToken`.
3. **Database Hash Verification**: The refresh token is hashed with `bcrypt` (10 rounds) and stored in `User.refreshHash`. On rotation (`POST /api/auth/refresh`), both tokens are refreshed and the old hash is replaced.
4. **Password Reset Invalidation**: Calling `POST /api/auth/change-password` sets `User.refreshHash = null`, immediately terminating all other active sessions.

### Permission Strings
- **Catalog**: `catalog:read`, `catalog:create`, `catalog:update`, `catalog:delete`
- **Inventory**: `inventory:read`, `inventory:receive`, `inventory:issue`, `inventory:cancel`, `inventory:update`
- **Commercial**: `commercial:read`, `commercial:create`, `commercial:update`, `commercial:delete`
- **Users**: `user:read`, `user:create`, `user:update`, `user:delete`
- *Note*: Any user with `Role.name === 'SUPER_ADMIN'` automatically bypasses all permissions.

---

## 5. Complete API Endpoints & Request/Response Catalog

### Common Query DTO for All List Endpoints (`PaginationQueryDTO`)
- `page`: number (default: `1`)
- `per_page`: number (default: `20`)
- `search`: string (case-insensitive substring search)

---

### 5.1 Auth & User Management

| Route | Method | Perm / Auth | Payload / Params | Response Summary |
|---|---|---|---|---|
| `/api/auth/login` | `POST` | Public | `{ email, password }` | `{ user, accessToken }` + sets `refreshToken` cookie |
| `/api/auth/refresh` | `POST` | Cookie | Reads `refreshToken` cookie | `{ user, accessToken }` + sets new `refreshToken` cookie |
| `/api/auth/logout` | `POST` | Bearer | None | `{ message: "Logged out successfully" }` + clears cookie |
| `/api/auth/change-password` | `POST` | Bearer | `{ oldPassword, newPassword }` | `{ message: "Password changed successfully..." }` |
| `/api/users/register` | `POST` | `user:create` | `multipart/form-data`: `name, email, password, gender, roleId, phone?` + files `image?`, `signature?` | Created user object |
| `/api/users` | `GET` | `user:read` | `?page=&per_page=&search=` | Paginated users list |
| `/api/users/:id` | `GET` | `user:read` | `id` | User object + role details |
| `/api/users/:id` | `PATCH` | `user:update` | `{ name?, phone?, gender?, roleId?, status? }` | Updated user object |
| `/api/users/:id` | `DELETE` | `user:delete` | `id` | Sets status `DELETED` |
| `/api/users/:id/restore` | `POST` | `user:update` | `id` | Sets status `ACTIVE` |

---

### 5.2 Master Data Attributes (Product & Warehouse)

All attribute controllers support full standard CRUD + soft-delete restore:

| Resource | Base Path | Unique Constraints | Supported Endpoints |
|---|---|---|---|
| **Categories** | `/api/attributes/categories` | `name` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`, `POST /:id/restore` |
| **SubCategories** | `/api/attributes/subcategories` | `categoryId + name` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`, `POST /:id/restore` |
| **Colors** | `/api/attributes/colors` | `name` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`, `POST /:id/restore` (Accepts `code` hex) |
| **Materials** | `/api/attributes/materials` | `name` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`, `POST /:id/restore` |
| **Warehouses** | `/api/attributes/warehouses` | `code` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`, `POST /:id/restore` |
| **Zones** | `/api/attributes/zones` | `warehouseId + code` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`, `POST /:id/restore` |
| **SubZones** | `/api/attributes/subzones` | `zoneId + code` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`, `POST /:id/restore` |
| **Racks** | `/api/attributes/racks` | `subZoneId + code` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`, `POST /:id/restore` |
| **Locations** | `/api/attributes/locations` | `code` | `GET /`, `GET /:id`, `GET /barcode/:code`, `POST /`, `PATCH /:id`, `DELETE /:id`, `POST /:id/restore` |

---

### 5.3 Products & Variants Catalog

| Route | Method | Payload / Query | Description |
|---|---|---|---|
| `/api/master-products` | `GET` | `?page=&per_page=&search=&categoryId=&subCategoryId=&materialId=` | Paginated master products |
| `/api/master-products/:id` | `GET` | `id` | Master product with all active variants, category, subcategory, material |
| `/api/master-products` | `POST` | `{ name, sku, categoryId, subCategoryId, materialId, description? }` | Create master product |
| `/api/master-products/:id` | `PATCH` | `{ name?, categoryId?, subCategoryId?, materialId?, description? }` | Update master product |
| `/api/master-products/:id` | `DELETE` | `id` | Soft delete (sets `DELETED`) |
| `/api/master-products/:id/restore`| `POST` | `id` | Restore |
| `/api/variants` | `GET` | `?page=&per_page=&search=&masterProductId=&colorId=&gender=&size=` | Paginated variants list |
| `/api/variants/:id` | `GET` | `id` | Single variant with stock & color |
| `/api/variants` | `POST` | `{ name, sku, size, colorId, gender, uom, itemsPerPacket, masterProductId, costPrice?, sellingPrice?, mrp? }` | Single variant create |
| `/api/variants/bulk` | `POST` | `{ masterProductId, colorId, gender, uom, itemsPerPacket, sizes: string[] }` | Generates multiple sizes at once |
| `/api/variants/:id/picture` | `POST` | `multipart/form-data` (`picture` file) | Upload picture to variant |
| `/api/variants/:id` | `PATCH` | `{ name?, size?, colorId?, costPrice?, sellingPrice?, mrp?, itemsPerPacket? }` | Update variant |
| `/api/variants/:id` | `DELETE` | `id` | Soft delete variant |

---

### 5.4 Commercial (Buyers, LC & PO)

| Route | Method | Description & Payload |
|---|---|---|
| `/api/buyers` | `GET / POST / PATCH / DELETE / POST :id/restore` | Full CRUD for Buyers (`name, code, country, email, phone, address, contactPerson`) |
| `/api/lcs` | `GET / POST / PATCH / DELETE / POST :id/restore` | Full CRUD for Letters of Credit (`lcNumber, buyerId, issueDate, expiryDate, shipmentDate, remarks, status`) |
| `/api/pos` | `GET` | Paginated PO list with Buyer, LC, line items, and fulfillment calculations |
| `/api/pos/:id` | `GET` | Single PO with full line items, shipped counts, and linked stock-outs |
| `/api/pos` | `POST` | `{ poNumber, buyerId, lcId?, orderDate?, deliveryDate?, remarks?, items: [{ variantProductId, quantity }] }` |
| `/api/pos/:id` | `PATCH` | `{ poNumber?, buyerId?, lcId?, deliveryDate?, remarks?, status? }` |
| `/api/pos/:id/items` | `POST` | `{ items: [{ variantProductId, quantity }] }` ── Dynamically adds new line items to PO |
| `/api/pos/:id` | `DELETE` | Soft delete PO |

---

### 5.5 Inventory (Stock-In, Batches, Stock Overview, Movements)

#### Stock-In Execution (`POST /api/inventory/stock-in`)
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data` or `application/json`
- **Fields**:
  - `masterProductId` (optional if explicit variantProductIds provided)
  - `productionDate` (required, ISO string)
  - `expirationDate` (optional, defaults to productionDate + 2 years)
  - `batch_id` / `batch_number` (optional, auto-generated if blank)
  - `poId` (optional link to PO)
  - `defaultLocationId` (fallback storage location)
  - `note` (optional)
  - `document` (optional multipart file attachment)
  - `items`: JSON string or array of:
    ```json
    [
      {
        "variantProductId": "cuid...",
        "receivedQty": 50,
        "itemsPerPacket": 5,
        "locationId": "cuid..."
      },
      {
        "size": "42",
        "gender": "MALE",
        "quantity": 30,
        "rackId": "cuid..."
      }
    ]
    ```

#### Additional Inventory Endpoints
| Route | Method | Description |
|---|---|---|
| `/api/inventory/stock-in/preview` | `GET` | `?masterProductId=&colorId=&gender=` ── Returns all variants & active locations |
| `/api/inventory/batches` | `GET` | `?poId=&productId=&productionDateFrom=&productionDateTo=&expirationDateFrom=&expirationDateTo=` |
| `/api/inventory/batches/:id` | `GET` | Returns single batch with batch items, location, and attached documents |
| `/api/inventory/batches/:id` | `PATCH` | `{ batch_number?, productionDate?, expirationDate?, poId? }` |
| `/api/inventory/batch-items/:id` | `PATCH` | `{ locationId?, rackId?, quantity?, receivedQty?, colorId?, size?, itemsPerPacket?, note? }` |
| `/api/inventory/stock` | `GET` | `?masterProductId=&variantProductId=&warehouseId=&zoneId=&subZoneId=&rackId=&locationId=` ── Aggregated live stock |
| `/api/inventory/movements` | `GET` | `?type=&inventoryBatchItemId=&productId=&fromDate=&toDate=` ── Audit ledger |

---

### 5.6 Stock-Out (Challans, Status Workflow, Cancellation)

| Route | Method | Description & Payload |
|---|---|---|
| `/api/inventory/stock-out/preview-po/:poId` | `GET` | Checks stock availability across all warehouse racks using FIFO for PO line items |
| `/api/inventory/stock-out` | `POST` | `{ type, poId?, buyerId?, destination?, dispatchDate?, note?, items: [{ batchItemId, issueQty }] }` |
| `/api/inventory/stock-out` | `GET` | `?page=&per_page=&search=&poId=&buyerId=&type=&status=&fromDate=&toDate=` (Uses fast `_count` aggregation) |
| `/api/inventory/stock-out/:id` | `GET` | Detailed challan record with full variant line items, batch references, issuer, and buyer |
| `/api/inventory/stock-out/:id/status` | `PATCH` | `multipart/form-data`: `status` (`DELIVERED`/`PAYMENT_RECEIVED`), `note?`, file `receiptDocument?` |
| `/api/inventory/stock-out/:id/cancel` | `POST` | `{ note? }` ── Restores batchItem availableQty, variant shippableQty, PO shippedQty, logs `RETURN` movements |

---

## 6. Business Logic, Auto-Calculations & State Machines

### 1. Stock-In Auto-Resolution & Transaction Guarantee
When `StockInService.executeStockIn()` executes:
1. Runs inside `prisma.$transaction(async (tx) => ...)`.
2. Resolves rack IDs to location IDs.
3. Automatically queries all candidate custom sizes in a single batch query (no N+1 loops).
4. Auto-creates non-existent `VariantProduct` records with generated SKUs (`MASTER_SKU-COLOR-SIZE`) and barcodes (`PROD...`).
5. Bulk creates `BatchItem` records and matching `InventoryMovement` entries (`type: RECEIVED`).
6. Increments `VariantProduct.shippableQuantity`.
7. If linked to `poId`, increments `POItem.shippedQuantity` and transitions PO to `READY_FOR_SHIPMENT` or `IN_PRODUCTION`.

### 2. Stock-Out Forward-Only State Machine
```
   ┌─────────┐
   │ ISSUED  │ ──(POST /cancel)──▶ [ CANCELLED ] (Inventory Reversed)
   └────┬────┘
        │ (PATCH /status -> DELIVERED + receiptDocument)
        ▼
 ┌─────────────┐
 │  DELIVERED  │
 └──────┬──────┘
        │ (PATCH /status -> PAYMENT_RECEIVED)
        ▼
┌───────────────────┐
│ PAYMENT_RECEIVED  │ (Final Closed State)
└───────────────────┘
```

### 3. Purchase Order Fulfillment Progression
- `PO.totalQuantity`: Calculated dynamically from sum of `POItem.quantity`.
- Progress %: $\frac{\sum \text{POItem.shippedQuantity}}{\sum \text{POItem.quantity}} \times 100\%$.
- When all items fulfilled $\rightarrow$ `PO.status = 'COMPLETED'`.
- When all POs for an LC are `'COMPLETED'` $\rightarrow$ `LC.status = 'FULFILLED'`.

---

## 7. File Uploads, Storage & Static Serving

- **Destination Folder**: `<root>/uploads`
- **Static Assets Route**: `GET /uploads/:filename`
- **Naming Format**: `<UUID>.<ext>`
- **Upload Types**:
  - `User.image` (Avatar): max 5MB (`.jpg`, `.png`, `.webp`)
  - `User.signature` (Digital Signature): max 5MB (`.png`, `.jpg`)
  - `VariantProduct.picture`: max 10MB (`.jpg`, `.png`, `.webp`)
  - `Document.path` (Stock-In Invoices/Challans): max 10MB (`.pdf`, `.jpg`, `.png`)
  - `StockOut.receiptDocument` (Signed Proof of Delivery): max 10MB (`.pdf`, `.jpg`, `.png`)

---

## 8. Automated E2E Test Suite Reference

All test files reside in `/test` and execute with `npm run test:e2e`:

| Suite | File | Tests | Core Invariants Verified |
|---|---|:---:|---|
| **1. Auth & Users** | `auth.e2e-spec.ts` | 14 | Login, Token rotation, Cookie management, Password change hash invalidation, User CRUD, Soft-delete & restore |
| **2. Master Data** | `master-data.e2e-spec.ts` | 33 | All attribute models (Categories, SubCategories, Colors, Materials, Warehouses, Zones, SubZones, Racks, Locations, Barcode lookups) |
| **3. Inventory Engine** | `inventory.e2e-spec.ts` | 17 | Stock-in preview, batch generation, custom size auto-creation, stock queries, movements ledger, stock-out FIFO, status progression, cancellation reversal |
| **4. Commercial** | `commercial.e2e-spec.ts` | 19 | Buyer management, LC lifecycle, PO creation with nested line items, dynamic item addition, fulfillment progress tracking |
| **5. File Uploads** | `file-upload.e2e-spec.ts` | 14 | Multipart uploads for user avatars & signatures, variant pictures, stock-in batch documents, delivery receipts, static asset retrieval |
| **Total** | — | **97** | **100% End-to-End Coverage Across Entire Backend** |

---

## 9. Environment Variables, Setup & Migrations

### Required `.env` File Template
```env
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/giant_bd?schema=public"
JWT_ACCESS_SECRET="giant_bd_access_secret_key_2026"
JWT_REFRESH_SECRET="giant_bd_refresh_secret_key_2026"
JWT_REFRESH_EXPIRE="30d"
FRONTEND_URL="http://localhost:3000,http://localhost:5173"
NODE_ENV="development"
```

### Essential CLI Commands
```bash
# Run locally
npm run start:dev

# Run production build
npm run build
npm run start:prod

# Execute all automated E2E tests
npm run test:e2e

# Database schema migrations
npx prisma migrate dev --name init
npx prisma generate

# Prisma visual studio browser
npx prisma studio
```
