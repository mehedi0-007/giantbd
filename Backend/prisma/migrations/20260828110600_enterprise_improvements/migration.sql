-- CreateEnum
CREATE TYPE "LCStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'FULFILLED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_SHIPMENT', 'PARTIALLY_SHIPPED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockOutType" AS ENUM ('PO_SHIPMENT', 'DIRECT_SALE', 'SAMPLE_DISPATCH', 'DAMAGE_SCRAP', 'INTERNAL_TRANSFER');

-- CreateEnum
CREATE TYPE "StockOutStatus" AS ENUM ('ISSUED', 'DELIVERED', 'PAYMENT_RECEIVED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'DELETED';

-- DropForeignKey
ALTER TABLE "BatchItem" DROP CONSTRAINT "BatchItem_rackId_fkey";

-- DropIndex
DROP INDEX "BatchItem_productId_batchId_rackId_key";

-- DropIndex
DROP INDEX "BatchItem_rackId_idx";

-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "poId" TEXT;

-- AlterTable
ALTER TABLE "BatchItem" DROP COLUMN "rackId",
ADD COLUMN     "locationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "size" INTEGER,
ADD COLUMN     "stockOutId" TEXT;

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "isTwoFactorRequired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otpAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "otpHash" TEXT;

-- CreateTable
CREATE TABLE "StorageLocation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "warehouseId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "subZoneId" TEXT,
    "rackId" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Buyer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "country" TEXT,
    "contactPerson" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Buyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LC" (
    "id" TEXT NOT NULL,
    "lcNumber" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "shipmentDate" TIMESTAMP(3),
    "status" "LCStatus" NOT NULL DEFAULT 'OPEN',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PO" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "lcId" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDate" TIMESTAMP(3),
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "POStatus" NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POItem" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "variantProductId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "producedQuantity" INTEGER NOT NULL DEFAULT 0,
    "shippedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "POItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockOut" (
    "id" TEXT NOT NULL,
    "challanNumber" TEXT NOT NULL,
    "type" "StockOutType" NOT NULL DEFAULT 'PO_SHIPMENT',
    "status" "StockOutStatus" NOT NULL DEFAULT 'ISSUED',
    "partialSequence" INTEGER DEFAULT 1,
    "dispatchDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "poId" TEXT,
    "buyerId" TEXT,
    "destination" TEXT,
    "note" TEXT,
    "receiptDocument" TEXT,
    "issuerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockOut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockOutItem" (
    "id" TEXT NOT NULL,
    "stockOutId" TEXT NOT NULL,
    "variantProductId" TEXT NOT NULL,
    "batchItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockOutItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorageLocation_code_key" ON "StorageLocation"("code");

-- CreateIndex
CREATE INDEX "StorageLocation_warehouseId_idx" ON "StorageLocation"("warehouseId");

-- CreateIndex
CREATE INDEX "StorageLocation_zoneId_idx" ON "StorageLocation"("zoneId");

-- CreateIndex
CREATE INDEX "StorageLocation_subZoneId_idx" ON "StorageLocation"("subZoneId");

-- CreateIndex
CREATE INDEX "StorageLocation_rackId_idx" ON "StorageLocation"("rackId");

-- CreateIndex
CREATE INDEX "StorageLocation_status_idx" ON "StorageLocation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Buyer_code_key" ON "Buyer"("code");

-- CreateIndex
CREATE INDEX "Buyer_status_idx" ON "Buyer"("status");

-- CreateIndex
CREATE INDEX "Buyer_country_idx" ON "Buyer"("country");

-- CreateIndex
CREATE UNIQUE INDEX "LC_lcNumber_key" ON "LC"("lcNumber");

-- CreateIndex
CREATE INDEX "LC_buyerId_idx" ON "LC"("buyerId");

-- CreateIndex
CREATE INDEX "LC_status_idx" ON "LC"("status");

-- CreateIndex
CREATE INDEX "LC_expiryDate_idx" ON "LC"("expiryDate");

-- CreateIndex
CREATE INDEX "LC_shipmentDate_idx" ON "LC"("shipmentDate");

-- CreateIndex
CREATE UNIQUE INDEX "PO_poNumber_key" ON "PO"("poNumber");

-- CreateIndex
CREATE INDEX "PO_buyerId_idx" ON "PO"("buyerId");

-- CreateIndex
CREATE INDEX "PO_lcId_idx" ON "PO"("lcId");

-- CreateIndex
CREATE INDEX "PO_status_idx" ON "PO"("status");

-- CreateIndex
CREATE INDEX "PO_orderDate_idx" ON "PO"("orderDate");

-- CreateIndex
CREATE INDEX "PO_deliveryDate_idx" ON "PO"("deliveryDate");

-- CreateIndex
CREATE INDEX "POItem_poId_idx" ON "POItem"("poId");

-- CreateIndex
CREATE INDEX "POItem_variantProductId_idx" ON "POItem"("variantProductId");

-- CreateIndex
CREATE UNIQUE INDEX "StockOut_challanNumber_key" ON "StockOut"("challanNumber");

-- CreateIndex
CREATE INDEX "StockOut_poId_idx" ON "StockOut"("poId");

-- CreateIndex
CREATE INDEX "StockOut_buyerId_idx" ON "StockOut"("buyerId");

-- CreateIndex
CREATE INDEX "StockOut_type_idx" ON "StockOut"("type");

-- CreateIndex
CREATE INDEX "StockOut_status_idx" ON "StockOut"("status");

-- CreateIndex
CREATE INDEX "StockOut_dispatchDate_idx" ON "StockOut"("dispatchDate");

-- CreateIndex
CREATE INDEX "StockOut_createdAt_idx" ON "StockOut"("createdAt");

-- CreateIndex
CREATE INDEX "StockOutItem_stockOutId_idx" ON "StockOutItem"("stockOutId");

-- CreateIndex
CREATE INDEX "StockOutItem_variantProductId_idx" ON "StockOutItem"("variantProductId");

-- CreateIndex
CREATE INDEX "StockOutItem_batchItemId_idx" ON "StockOutItem"("batchItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_batch_id_key" ON "Batch"("batch_id");

-- CreateIndex
CREATE INDEX "Batch_poId_idx" ON "Batch"("poId");

-- CreateIndex
CREATE INDEX "BatchItem_locationId_idx" ON "BatchItem"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchItem_productId_batchId_locationId_key" ON "BatchItem"("productId", "batchId", "locationId");

-- CreateIndex
CREATE INDEX "Document_batchId_idx" ON "Document"("batchId");

-- CreateIndex
CREATE INDEX "Document_stockOutId_idx" ON "Document"("stockOutId");

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PO"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_stockOutId_fkey" FOREIGN KEY ("stockOutId") REFERENCES "StockOut"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchItem" ADD CONSTRAINT "BatchItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StorageLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageLocation" ADD CONSTRAINT "StorageLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageLocation" ADD CONSTRAINT "StorageLocation_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageLocation" ADD CONSTRAINT "StorageLocation_subZoneId_fkey" FOREIGN KEY ("subZoneId") REFERENCES "SubZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageLocation" ADD CONSTRAINT "StorageLocation_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "Rack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LC" ADD CONSTRAINT "LC_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PO" ADD CONSTRAINT "PO_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PO" ADD CONSTRAINT "PO_lcId_fkey" FOREIGN KEY ("lcId") REFERENCES "LC"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POItem" ADD CONSTRAINT "POItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POItem" ADD CONSTRAINT "POItem_variantProductId_fkey" FOREIGN KEY ("variantProductId") REFERENCES "VariantProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOut" ADD CONSTRAINT "StockOut_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PO"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOut" ADD CONSTRAINT "StockOut_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOut" ADD CONSTRAINT "StockOut_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOutItem" ADD CONSTRAINT "StockOutItem_stockOutId_fkey" FOREIGN KEY ("stockOutId") REFERENCES "StockOut"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOutItem" ADD CONSTRAINT "StockOutItem_variantProductId_fkey" FOREIGN KEY ("variantProductId") REFERENCES "VariantProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOutItem" ADD CONSTRAINT "StockOutItem_batchItemId_fkey" FOREIGN KEY ("batchItemId") REFERENCES "BatchItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Concurrency Safety: Check Constraints to Guarantee Non-Negative Inventory
ALTER TABLE "BatchItem" ADD CONSTRAINT "chk_batch_item_available_qty" CHECK ("availableQty" >= 0);
ALTER TABLE "VariantProduct" ADD CONSTRAINT "chk_variant_shippable_qty" CHECK ("shippableQuantity" >= 0);

