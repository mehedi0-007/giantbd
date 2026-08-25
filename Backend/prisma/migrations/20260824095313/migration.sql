/*
  Warnings:

  - You are about to drop the column `createdBy` on the `MasterProduct` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Color` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[categoryId,name]` on the table `SubCategory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `creatorId` to the `MasterProduct` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Color" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "MasterProduct" DROP COLUMN "createdBy",
ADD COLUMN     "creatorId" TEXT NOT NULL,
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "VariantProduct" ADD COLUMN     "costPrice" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "mrp" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "sellingPrice" DOUBLE PRECISION DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Color_name_key" ON "Color"("name");

-- CreateIndex
CREATE INDEX "Color_status_idx" ON "Color"("status");

-- CreateIndex
CREATE INDEX "MasterProduct_creatorId_idx" ON "MasterProduct"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "SubCategory_categoryId_name_key" ON "SubCategory"("categoryId", "name");

-- AddForeignKey
ALTER TABLE "MasterProduct" ADD CONSTRAINT "MasterProduct_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
