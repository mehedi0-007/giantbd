import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const LOW_STOCK_THRESHOLD = 30;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // 1. Parallel SQL Aggregations & Query Execution
    const [
      stockAgg,
      lowStockResult,
      poCountResult,
      poFulfillmentResult,
      lcCountResult,
      buyerCountResult,
      todayStockInResult,
      todayStockOutResult,
      poStatusDistribution,
      monthlyMovements,
      activeLcsRaw,
      pendingChallansRaw,
      recentBatchesRaw,
    ] = await Promise.all([
      // Stock total available
      this.prisma.batchItem.aggregate({
        _sum: { availableQty: true },
      }),
      // Low stock count
      this.prisma.batchItem.count({
        where: {
          availableQty: { gt: 0, lt: LOW_STOCK_THRESHOLD },
        },
      }),
      // Active POs
      this.prisma.pO.count({
        where: {
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),
      // PO fulfillment rate (quantities)
      this.prisma.pOItem.aggregate({
        _sum: { quantity: true, shippedQuantity: true },
      }),
      // Active LCs
      this.prisma.lC.count({
        where: {
          status: { not: 'CANCELLED' },
        },
      }),
      // Total active buyers
      this.prisma.buyer.count({
        where: {
          status: { not: 'DELETED' },
        },
      }),
      // Today's stock-in movements
      this.prisma.inventoryMovement.count({
        where: {
          type: 'RECEIVED',
          createdAt: { gte: today },
        },
      }),
      // Today's stock-out challans
      this.prisma.stockOut.count({
        where: {
          dispatchDate: { gte: today },
        },
      }),
      // PO status distribution
      this.prisma.pO.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      // Monthly movement data for the past 6 months
      this.prisma.inventoryMovement.findMany({
        where: {
          createdAt: { gte: sixMonthsAgo },
          type: { in: ['RECEIVED', 'RETURN', 'SALE', 'DAMAGE'] },
        },
        select: {
          type: true,
          quantity: true,
          createdAt: true,
        },
      }),
      // Active LCs list (limit 10)
      this.prisma.lC.findMany({
        where: { status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          buyer: { select: { name: true } },
          _count: { select: { purchaseOrders: true } },
        },
      }),
      // Pending Challans (limit 10)
      this.prisma.stockOut.findMany({
        where: { status: 'ISSUED' },
        orderBy: { dispatchDate: 'desc' },
        take: 10,
        include: {
          buyer: { select: { name: true } },
          po: { include: { buyer: { select: { name: true } } } },
          items: { select: { id: true } },
        },
      }),
      // Recent Stock Batches (limit 6)
      this.prisma.batch.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          po: { select: { poNumber: true } },
          batchItems: {
            include: {
              product: {
                include: {
                  color: { select: { name: true } },
                  masterProduct: {
                    select: { name: true, material: { select: { name: true } } },
                  },
                },
              },
              location: { select: { code: true, name: true } },
            },
          },
        },
      }),
    ]);

    // 2. Compute KPI Metrics
    const totalOrdered = poFulfillmentResult._sum.quantity || 0;
    const totalShipped = poFulfillmentResult._sum.shippedQuantity || 0;
    const poFulfillmentRate =
      totalOrdered > 0 ? Math.round((totalShipped / totalOrdered) * 100) : 0;

    const kpi = {
      totalStockPairs: stockAgg._sum.availableQty || 0,
      lowStockCount: lowStockResult,
      activePoCount: poCountResult,
      poFulfillmentRate,
      activeLcCount: lcCountResult,
      totalBuyersCount: buyerCountResult,
      todayStockInBatches: todayStockInResult,
      todayStockOutChallans: todayStockOutResult,
    };

    // 3. Format PO Distribution
    const poColorMap: Record<string, { label: string; color: string }> = {
      DRAFT: { label: 'Draft', color: '#94a3b8' },
      CONFIRMED: { label: 'Confirmed', color: '#3b82f6' },
      IN_PRODUCTION: { label: 'In Production', color: '#f59e0b' },
      READY_FOR_SHIPMENT: { label: 'Ready', color: '#8b5cf6' },
      PARTIALLY_SHIPPED: { label: 'Partial Ship', color: '#06b6d4' },
      COMPLETED: { label: 'Completed', color: '#10b981' },
      CANCELLED: { label: 'Cancelled', color: '#ef4444' },
    };

    const poDistribution = poStatusDistribution
      .map((item) => ({
        name: poColorMap[item.status]?.label || item.status,
        count: item._count.id,
        color: poColorMap[item.status]?.color || '#64748b',
      }))
      .filter((item) => item.count > 0);

    // 4. Compute 6-Month Trend Matrix
    const monthMap = new Map<string, { stockIn: number; stockOut: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mKey = d.toLocaleString('en-US', { month: 'short' });
      monthMap.set(mKey, { stockIn: 0, stockOut: 0 });
    }

    for (const mov of monthlyMovements) {
      const mKey = new Date(mov.createdAt).toLocaleString('en-US', {
        month: 'short',
      });
      const target = monthMap.get(mKey);
      if (target) {
        if (mov.type === 'RECEIVED' || mov.type === 'RETURN') {
          target.stockIn += mov.quantity;
        } else if (mov.type === 'SALE' || mov.type === 'DAMAGE') {
          target.stockOut += mov.quantity;
        }
      }
    }

    const movementTrends = Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      stockIn: data.stockIn,
      stockOut: data.stockOut,
    }));

    // 5. Format Active LCs
    const activeLcs = activeLcsRaw.map((lc) => ({
      id: lc.id,
      lcNumber: lc.lcNumber,
      buyerName: lc.buyer?.name || 'Unknown Buyer',
      posCount: lc._count?.purchaseOrders || 0,
      status: lc.status,
    }));

    // 6. Format Pending Challans
    const pendingChallans = pendingChallansRaw.map((so) => ({
      id: so.id,
      challanNumber: so.challanNumber,
      buyerName: so.buyer?.name || so.po?.buyer?.name || 'Direct Client',
      destination: so.destination || 'Main Delivery',
      dispatchDate: so.dispatchDate.toISOString(),
      itemsCount: so.items.length,
      status: so.status,
    }));

    // 7. Format Recent Batches
    const recentStocks = recentBatchesRaw.map((batch) => {
      const firstItem = batch.batchItems[0];
      const availableQty = batch.batchItems.reduce(
        (sum, bi) => sum + bi.availableQty,
        0,
      );
      const totalQty = batch.batchItems.reduce(
        (sum, bi) => sum + bi.receivedQty,
        0,
      );
      const packetCount = batch.batchItems.reduce(
        (sum, bi) => sum + bi.packetCount,
        0,
      );

      return {
        id: batch.id,
        batchId: batch.batch_id,
        batchNumber: batch.batch_number,
        productName:
          firstItem?.product?.masterProduct?.name || 'Product Batch',
        material:
          firstItem?.product?.masterProduct?.material?.name || 'Standard',
        colorName: firstItem?.product?.color?.name || 'Assorted',
        gender: firstItem?.product?.gender || 'UNISEX',
        availableQty,
        totalQty,
        packetCount,
        locationName: firstItem?.location?.code || firstItem?.location?.name || 'Warehouse',
        poNumber: batch.po?.poNumber,
        createdAt: batch.createdAt.toISOString(),
      };
    });

    return {
      kpi,
      movementTrends,
      poDistribution,
      activeLcs,
      pendingChallans,
      recentStocks,
    };
  }
}
