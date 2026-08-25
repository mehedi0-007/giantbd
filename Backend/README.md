# 🏭 Giant BD — Enterprise Warehouse & Commercial Backend

> Robust NestJS + Prisma + PostgreSQL ERP & WMS Backend with 100% E2E test verification.

---

## 📖 Documentation & Architecture

For complete system documentation, entity relationships, business logic, and API references, see:
👉 **[BACKEND_HANDBOOK.md](./BACKEND_HANDBOOK.md)**

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Configure `.env` with your database and JWT secrets:
```env
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/giant_bd?schema=public"
JWT_ACCESS_SECRET="your-jwt-access-secret"
JWT_REFRESH_SECRET="your-jwt-refresh-secret"
JWT_REFRESH_EXPIRE="30d"
FRONTEND_URL="http://localhost:3000,http://localhost:5173"
NODE_ENV="development"
```

### 3. Database Migration & Prisma Client
```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Run Development Server
```bash
npm run start:dev
```
Server runs at `http://localhost:3000/api`.

---

## 🧪 Running Automated Tests

The codebase includes **97 comprehensive E2E tests** covering all modules:

```bash
# Run all E2E test suites
npm run test:e2e

# Run a specific test suite
npm run test:e2e test/auth.e2e-spec.ts
npm run test:e2e test/master-data.e2e-spec.ts
npm run test:e2e test/inventory.e2e-spec.ts
npm run test:e2e test/commercial.e2e-spec.ts
npm run test:e2e test/file-upload.e2e-spec.ts
```

---

## 📦 Key Modules

- **Auth & RBAC**: JWT Access + Refresh rotation (bcrypt hashed), cookie management, role & permission guards.
- **Product Catalog**: Master products, on-the-fly variant resolution, size matrices, picture uploads.
- **Warehouse & Storage**: Hierarchical storage locations (Warehouse ➔ Zone ➔ SubZone ➔ Rack ➔ Location) with barcode support.
- **Inventory Engine**: Stock-In batch creation, document attachments, FIFO stock-out challans with safe state transitions and cancellation rollbacks.
- **Commercial Management**: Buyers, Letters of Credit (LC) with expiry alerts, Purchase Orders (PO) with dynamic fulfillment tracking.
