/*
  Warnings:

  - You are about to drop the column `name` on the `Batch` table. All the data in the column will be lost.
  - You are about to drop the `InventoryBatchItem` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[batch_id,productionDate]` on the table `Batch` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `batch_id` to the `Batch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `batch_number` to the `Batch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `module` to the `Permission` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `gender` on the `VariantProduct` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PRODUCT_GENDER" AS ENUM ('MALE', 'LADY', 'KIDS', 'JUNIOR', 'TWIN_JUNIOR');

-- DropForeignKey
ALTER TABLE "InventoryBatchItem" DROP CONSTRAINT "InventoryBatchItem_batchId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryBatchItem" DROP CONSTRAINT "InventoryBatchItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryBatchItem" DROP CONSTRAINT "InventoryBatchItem_rackId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryMovement" DROP CONSTRAINT "InventoryMovement_inventoryBatchItemId_fkey";

-- DropIndex
DROP INDEX "Batch_name_productionDate_key";

-- AlterTable
ALTER TABLE "Batch" DROP COLUMN "name",
ADD COLUMN     "batch_id" TEXT NOT NULL,
ADD COLUMN     "batch_number" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "description" TEXT,
ADD COLUMN     "module" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VariantProduct" DROP COLUMN "gender",
ADD COLUMN     "gender" "PRODUCT_GENDER" NOT NULL;

-- DropTable
DROP TABLE "InventoryBatchItem";

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rackId" TEXT NOT NULL,
    "receivedQty" INTEGER NOT NULL,
    "availableQty" INTEGER NOT NULL,
    "itemsPerPacket" INTEGER NOT NULL,
    "packetCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BatchItem_productId_idx" ON "BatchItem"("productId");

-- CreateIndex
CREATE INDEX "BatchItem_batchId_idx" ON "BatchItem"("batchId");

-- CreateIndex
CREATE INDEX "BatchItem_rackId_idx" ON "BatchItem"("rackId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchItem_productId_batchId_rackId_key" ON "BatchItem"("productId", "batchId", "rackId");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_batch_id_productionDate_key" ON "Batch"("batch_id", "productionDate");

-- CreateIndex
CREATE INDEX "Permission_module_idx" ON "Permission"("module");

-- CreateIndex
CREATE INDEX "Role_status_idx" ON "Role"("status");

-- AddForeignKey
ALTER TABLE "BatchItem" ADD CONSTRAINT "BatchItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "VariantProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchItem" ADD CONSTRAINT "BatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchItem" ADD CONSTRAINT "BatchItem_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "Rack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryBatchItemId_fkey" FOREIGN KEY ("inventoryBatchItemId") REFERENCES "BatchItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
