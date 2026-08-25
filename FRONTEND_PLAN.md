# Giant BD — Frontend Architecture & Implementation Plan

## Stack & Foundation
| Concern | Decision |
|---|---|
| **Framework** | Next.js 14+ (App Router) |
| **Styling** | Tailwind CSS v4 + custom design tokens |
| **Components** | shadcn/ui (Radix primitives, fully customizable) |
| **Icons** | Lucide React |
| **Data Fetching** | TanStack Query v5 (React Query) |
| **HTTP Client** | Axios with JWT interceptor + auto-refresh |
| **Global State** | Zustand (auth session, sidebar, modals) |
| **Forms** | React Hook Form + Zod validation |
| **Tables** | TanStack Table v8 |
| **Charts** | Recharts |
| **PDF Generation** | React-PDF / `@react-pdf/renderer` |
| **Barcode / QR** | `react-barcode` / `qrcode.react` |
| **Theme** | Light mode (clean, professional ERP) |
| **Devices** | Desktop-first (1280px+ optimized) |

---

## Application Shell Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  TOPBAR:  [Logo]    [Breadcrumb]    [Search]    [🔔 Alerts]  [👤] │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                       │
│ SIDEBAR  │              MAIN CONTENT AREA                        │
│          │                                                       │
│ (Fixed,  │   (Scrollable, full width, dynamic per route)        │
│  240px)  │                                                       │
│          │                                                       │
└──────────┴──────────────────────────────────────────────────────┘
```

### Sidebar Navigation
```
📊 Dashboard
──────────────
🏢 Commercial
   └ Buyers
   └ Letters of Credit
   └ Purchase Orders
──────────────
📦 Catalog
   └ Products
   └ Attributes
──────────────
🏬 Warehouse
   └ Warehouses & Locations
──────────────
🔄 Inventory
   └ Stock-In
   └ Stock-Out
   └ Stock Overview
   └ Movements Ledger
──────────────
⚙️ System
   └ Users
   └ Roles & Permissions
   └ My Profile
```

---

## Section-by-Section Breakdown

---

### 1. 📊 Dashboard

**Purpose**: First screen users see. Command center for the whole operation.

**Top Row — 4 KPI Cards:**
| Card | Metric |
|---|---|
| 🟢 Total In-Hand Stock | Shippable pairs across all warehouses |
| 🟡 Open Purchase Orders | Count + % of orders behind schedule |
| 🔴 LCs Expiring Soon | Count of LCs expiring within 30 days |
| 🔵 Today's Activity | Stock-In batches + Stock-Out challans today |

**Middle Section — 2 Charts:**
- **Line Chart**: Monthly Stock-In vs. Stock-Out quantities (last 6 months)
- **Donut Chart**: PO status distribution (Draft / In Production / Shipped / Completed)

**Bottom Section — 2 Activity Feeds:**
- **Recent Stock-Out Challans awaiting status update** (quick `Mark as Delivered` action inline)
- **LCs expiring within 15 days** (with link to LC detail)

---

### 2. 🏢 Commercial Management

#### 2.1 Buyers Directory

**Page Layout**: Full-width data table with top filter bar and "New Buyer" button.

**Table Columns**: Code | Name | Country | Contact Person | Email | Phone | Status badge | Open POs | Actions

**Drawer (Create / Edit Buyer)**:
- Fields: Code*, Name*, Country, Address, Contact Person, Email, Phone, Status
- Tabs inside Buyer Detail page: **Overview** / **LC History** / **PO History**

**User Interactions**:
- Search by name/code
- Filter by country, status
- Soft delete with confirmation dialog
- Restore from deleted state

---

#### 2.2 Letters of Credit (LC)

**Page Layout**: Data table + side filter panel. LC cards view (alternative).

**Table Columns**: LC Number | Buyer Name | Issue Date | Shipment Date | Expiry Date (colored 🔴 if < 30 days) | Status badge | PO Count | Actions

**Status Badge Colors**:
- `OPEN` → Blue
- `IN_PROGRESS` → Amber
- `FULFILLED` → Green
- `EXPIRED` → Red
- `CANCELLED` → Gray

**Drawer (Create / Edit LC)**:
- Fields: LC Number*, Buyer (dropdown)*, Issue Date, Shipment Date, Expiry Date, Remarks

**LC Detail View** (full page):
- LC header info
- Tab: Linked Purchase Orders (with fulfillment progress per PO)

---

#### 2.3 Purchase Orders (PO)

**Page Layout**: Data table with prominent shipment progress indicator.

**Table Columns**: PO Number | Buyer | Linked LC | Order Date | Delivery Date | Total Qty | Progress Bar | Status | Actions

**Progress Bar Example**:
```
PARTIALLY_SHIPPED  [██████████░░░░░] 600/1000 Pairs  60%
```

**PO Detail Page** (dedicated full page, not drawer):
- **Header**: PO Number, Buyer, LC link, Dates, Status, Remarks
- **Items Table**: SKU | Product Name | Color | Size | Gender | Ordered Qty | Shipped Qty | Remaining Qty
- **Linked Challans Tab**: All stock-out challans associated with this PO
- **Add Items button**: Opens modal to add new variant products to the PO

---

### 3. 📦 Product Catalog

#### 3.1 Master Products

**Page Layout**: Card grid OR data table toggle, searchable.

**Master Product Card/Row Shows**: Thumbnail image, Name, SKU, Category, Material, Variant Count, Total Shippable Stock

**Master Product Detail Page**:
- Product info header with picture upload
- **Variant Matrix Table**:
  
| Size | Color | Gender | Barcode | SKU | Stock | Status |
|---|---|---|---|---|---|---|
| 38 | Red | MALE | `████` | SKU-001-R-38 | 120 pairs | Active |
| 39 | Red | MALE | `████` | SKU-001-R-39 | 85 pairs | Active |

- "Add Variants" button: opens a size-range generator (From size 36 → To size 44 in increments).
- Each variant row: click to edit prices, UOM, items per packet, upload picture.

#### 3.2 Attribute Management

**Single tabbed page** with 4 tabs: **Categories** | **Colors** | **Materials** | **Sub-Categories**

Each tab: Simple 2-column table (Name, Status) with inline Add / Edit / Delete. Color tab includes a HEX color swatch picker.

---

### 4. 🏬 Warehouse & Locations

#### 4.1 Warehouse Hierarchy

**Page Layout**: Left tree navigator + right detail panel.

```
Left Panel (Tree):                 Right Panel (Detail):
┌─────────────────────┐           ┌─────────────────────────┐
│ 🏭 Main Warehouse   │  ──────▶  │  Zone A — Ground Floor  │
│  └ Zone A           │           │  Sub-Zones: 3            │
│    └ Sub-Zone 1     │           │  Racks: 12               │
│       └ Rack 1A     │           │  Locations: 48           │
│       └ Rack 1B     │           │  Items Stored: 2,400 prs │
│    └ Sub-Zone 2     │           │                           │
│  └ Zone B           │           │  [+ Add Sub-Zone]         │
│ 🏭 Secondary WH     │           └─────────────────────────┘
└─────────────────────┘
```

#### 4.2 Storage Locations

**Table Columns**: Location Code | Warehouse | Zone | Sub-Zone | Rack | Items in Stock | Status

**Actions per row**:
- `🖨️ Print Barcode Label` → Generates a printable sticker:
  ```
  ┌─────────────────────┐
  │  GIANT BD           │
  │  ████████████████   │ (Barcode)
  │  WH1-ZA-SZ1-R1-L02  │
  └─────────────────────┘
  ```

---

### 5. 🔄 Inventory Operations

#### 5.1 📥 Stock-In (Goods Receipt Wizard)

**Multi-step wizard / form** (most complex workflow):

**Step 1 — Batch Information**:
- Master Product (searchable dropdown)
- Color + Gender (auto-loads from variants)
- Production Date* / Expiry Date
- PO Link (optional)
- Attach Supplier Invoice / Challan Document (file upload with preview)
- Note

**Step 2 — Item Quantities (Dynamic Grid)**:

Auto-loads all active variants for that Product+Color+Gender combo:

| Size | Barcode | Received Qty | Packet Count | Items/Pkt | Destination Location |
|---|---|---|---|---|---|
| 38 | `3456789` | [___] | [___] | 5 | [Location Picker] |
| 39 | `3456790` | [___] | [___] | 5 | [Location Picker] |
| 40 | `3456791` | [___] | [___] | 5 | [Location Picker] |

- Tab key navigation between cells for fast keyboard data entry
- "Set Default Location for All" shortcut button

**Step 3 — Review & Submit**:
- Summary table (SKU, Qty, Location, Batch ID auto-generated)
- Submit → Shows success with Batch Code → Option to "**Print Batch Label**"

**Batch Label (Printable)**:
```
┌──────────────────────────────┐
│  BATCH: BAT-20240801-4521    │
│  LOT:   LOT-2398             │
│  Product: Classic Runner     │
│  Color: Red | Gender: MALE   │
│  Prod. Date: 2024-08-01      │
│  Exp. Date:  2026-08-01      │
│  ████████████████████████    │ (Barcode)
└──────────────────────────────┘
```

---

#### 5.2 📤 Stock-Out (Challan Dispatch)

**Two entry modes** (tab switcher at top of page):

**Mode A: PO-Based Shipment**:
1. Select Purchase Order (search by PO number or Buyer)
2. System shows required items + FIFO-suggested batch sources
3. User confirms/adjusts issue quantities per batch item
4. Set Dispatch Date, Destination, Note
5. Submit → Challan generated with number `CHAL-20240801-A3F2`

**Mode B: Direct / Sample / Damage**:
1. Select Type (Direct Sale / Sample / Damage-Scrap / Internal Transfer)
2. Search & add batch items (SKU + Location + Available Qty shown)
3. Set quantities, destination, note
4. Submit → Challan generated

**Challan List Page**:

Table: Challan# | Type | Buyer | PO# | Dispatch Date | Total Qty | Status | Actions

**Status Workflow (inline in table)**:
```
[ISSUED] ──▶ [Mark as DELIVERED + upload receipt] ──▶ [Mark PAYMENT_RECEIVED]
                                                   ↕
                                              [Cancel & Revert Stock]
```

**Challan Detail / Print View**:

Official printable layout:
```
╔══════════════════════════════════════════════════╗
║           GIANT BD — DELIVERY CHALLAN            ║
║  Challan No: CHAL-20240801-A3F2                  ║
║  Date: 01-Aug-2024    PO: PO-2024-001            ║
║  Buyer: ABC Exports Ltd                          ║
╠══════════════════════════════════════════════════╣
║  #  │ SKU          │ Product          │ Qty      ║
║  1  │ SKU-001-R-38 │ Classic Runner   │  50 prs  ║
║  2  │ SKU-001-R-39 │ Classic Runner   │  80 prs  ║
╠══════════════════════════════════════════════════╣
║  Total: 130 pairs                                ║
║  Issuer: John Doe   [Signature Image]            ║
╚══════════════════════════════════════════════════╝
```

---

#### 5.3 📈 Current Stock (Real-time Overview)

**Search Bar** (prominent, top): Search by Barcode scan, SKU, Product name, or Location code

**Table Columns**: Product Name | SKU | Color | Size | Gender | Batch Code | Expiry Date | Warehouse | Location | Available Qty | Packets

**Filters**: Warehouse | Zone | Category | Color | Low Stock toggle (< 50 pairs)

---

#### 5.4 📜 Movements Ledger (Audit Trail)

**Table Columns**: DateTime | Type badge | SKU | Qty Change (`+120` green / `-30` red) | Batch | Location | Reference (Challan/Batch) | User

**Filters**: Date range | Movement Type | Product | Warehouse

---

### 6. ⚙️ System Administration

#### 6.1 User Management

**Table**: Name | Email | Role | Gender | Phone | Status | Avatar thumbnail | Actions

**Create/Edit User Drawer**:
- Name, Email, Password, Phone, Gender, Role (dropdown)
- **Avatar upload** (with crop preview)
- **Signature upload** (used on printed Challans)

#### 6.2 Roles & Permissions

**Matrix View**:

|  | catalog:read | catalog:create | inventory:receive | inventory:issue | commercial:create | ... |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ... |
| Warehouse Staff | ✅ | ❌ | ✅ | ✅ | ❌ | ... |
| Sales Manager | ✅ | ❌ | ❌ | ❌ | ✅ | ... |

Toggle checkboxes save automatically.

#### 6.3 My Profile

- Edit own name, phone, avatar, signature, change password form.

---

## 🚀 Implementation Phases

### Phase 1 — Foundation & Shell
- Next.js project setup with Tailwind + shadcn/ui
- Axios client with JWT interceptor + automatic refresh token handling
- Zustand auth store (token, user object, permissions)
- App shell: Sidebar, Topbar, Breadcrumb component
- Protected route wrapper (role-based guard)
- Login page

### Phase 2 — Dashboard
- KPI cards with real data from API
- Line chart (movements over time)
- PO status donut chart
- Expiring LC alerts
- Pending challan updates feed

### Phase 3 — Commercial (Buyers, LC, PO)
- Buyers CRUD with drawer
- LC CRUD with expiry date highlights
- PO CRUD with detail page + progress bars
- PO line item table + add items modal

### Phase 4 — Catalog & Attributes
- Master Product list + card/table toggle
- Master Product detail page with variant matrix table
- Variant picture upload
- Attribute management tabs (Categories, Colors, Materials, SubCategories)

### Phase 5 — Warehouse & Locations
- Warehouse hierarchy tree
- Storage Locations table
- Barcode label print generator

### Phase 6 — Inventory Operations
- Stock-In multi-step wizard with document upload
- Batch label print
- Stock-Out (Mode A: PO-based, Mode B: Direct) with FIFO display
- Challan list with inline status workflow
- Official Challan PDF print view (with issuer signature)
- Current Stock overview with barcode search
- Movements Ledger

### Phase 7 — System Administration
- User management (with avatar + signature upload)
- Role & Permissions matrix
- My Profile page

---

## 🔒 Confirmed Business Rules & Settings

- **Company Branding**: **Giant BD** (displayed in sidebar header & Challan PDFs).
- **Challan PDF Structure**: Enterprise format with Giant BD header, Challan No, Date, PO, Buyer, line items table, issuer digital signature, and recipient signature block.
- **Low Stock Threshold**: `< 30` pairs triggers amber/red low stock alert badges and dashboard warnings.
- **Barcode Standard**: **Code 128** format for warehouse locations & batch stickers.
- **Environment Configuration**: Fully `.env`-driven (`NEXT_PUBLIC_API_URL`, etc.) for seamless deployment on Vercel, Docker, or any VPS.

