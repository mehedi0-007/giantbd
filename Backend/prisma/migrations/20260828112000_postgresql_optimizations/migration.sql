-- PostgreSQL Performance Optimizations & Composite Indexes

-- 1. Create B-Tree composite & filtering indexes
CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");
CREATE INDEX IF NOT EXISTS "VariantProduct_masterProductId_colorId_status_idx" ON "VariantProduct"("masterProductId", "colorId", "status");
CREATE INDEX IF NOT EXISTS "BatchItem_productId_availableQty_idx" ON "BatchItem"("productId", "availableQty");
CREATE INDEX IF NOT EXISTS "InventoryMovement_type_createdAt_idx" ON "InventoryMovement"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryMovement_inventoryBatchItemId_createdAt_idx" ON "InventoryMovement"("inventoryBatchItemId", "createdAt");
CREATE INDEX IF NOT EXISTS "PO_status_orderDate_idx" ON "PO"("status", "orderDate");

-- 2. Enable pg_trgm extension for substring / wildcard search acceleration
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 3. Create GIN Trigram indexes on searchable text columns
CREATE INDEX IF NOT EXISTS "Batch_batch_id_trgm_idx" ON "Batch" USING gin ("batch_id" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Batch_batch_number_trgm_idx" ON "Batch" USING gin ("batch_number" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "MasterProduct_name_trgm_idx" ON "MasterProduct" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "MasterProduct_sku_trgm_idx" ON "MasterProduct" USING gin ("sku" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PO_poNumber_trgm_idx" ON "PO" USING gin ("poNumber" gin_trgm_ops);
