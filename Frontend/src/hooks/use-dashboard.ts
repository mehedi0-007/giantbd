'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardData } from '@/types/dashboard';

const LOW_STOCK_THRESHOLD = 30; // Business rule confirmed by user

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard-data'],
    queryFn: async () => {
      // Execute all 6 data queries in parallel for high performance
      const [stockRes, poRes, lcRes, stockOutRes, movementsRes, batchesRes] =
        await Promise.allSettled([
          api.get('/inventory/stock', { params: { per_page: 500 } }),
          api.get('/po', { params: { per_page: 200 } }),
          api.get('/lc', { params: { per_page: 200 } }),
          api.get('/inventory/stock-out', { params: { per_page: 100 } }),
          api.get('/inventory/movements', { params: { per_page: 500 } }),
          api.get('/inventory/batches', { params: { per_page: 6 } }),
        ]);

      // 1. Stock Metrics
      const stockData =
        stockRes.status === 'fulfilled'
          ? stockRes.value.data?.data?.data || stockRes.value.data?.data || []
          : [];

      let totalStockPairs = 0;
      let lowStockCount = 0;

      stockData.forEach((item: any) => {
        const qty = item.totalQuantity || item.availableQty || item.inHand || 0;
        totalStockPairs += qty;
        if (qty > 0 && qty < LOW_STOCK_THRESHOLD) {
          lowStockCount++;
        }
      });

      // 2. Purchase Orders Metrics & Distribution
      const poData =
        poRes.status === 'fulfilled'
          ? poRes.value.data?.data?.data || poRes.value.data?.data || []
          : [];

      const activePos = poData.filter(
        (p: any) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED',
      );

      let totalOrderedQty = 0;
      let totalShippedQty = 0;

      const poStatusCounts: Record<string, number> = {
        DRAFT: 0,
        CONFIRMED: 0,
        IN_PRODUCTION: 0,
        READY_FOR_SHIPMENT: 0,
        PARTIALLY_SHIPPED: 0,
        COMPLETED: 0,
      };

      poData.forEach((po: any) => {
        if (poStatusCounts[po.status] !== undefined) {
          poStatusCounts[po.status]++;
        }
        if (po.items) {
          po.items.forEach((i: any) => {
            totalOrderedQty += i.quantity || 0;
            totalShippedQty += i.shippedQuantity || 0;
          });
        }
      });

      const poFulfillmentRate =
        totalOrderedQty > 0
          ? Math.round((totalShippedQty / totalOrderedQty) * 100)
          : 0;

      const poDistribution = [
        { name: 'Draft', count: poStatusCounts.DRAFT, color: '#94a3b8' },
        { name: 'Confirmed', count: poStatusCounts.CONFIRMED, color: '#3b82f6' },
        { name: 'In Production', count: poStatusCounts.IN_PRODUCTION, color: '#f59e0b' },
        { name: 'Ready', count: poStatusCounts.READY_FOR_SHIPMENT, color: '#8b5cf6' },
        { name: 'Partial Ship', count: poStatusCounts.PARTIALLY_SHIPPED, color: '#06b6d4' },
        { name: 'Completed', count: poStatusCounts.COMPLETED, color: '#10b981' },
      ].filter((item) => item.count > 0);

      // 3. Letters of Credit (LC) Registry Overview
      const lcData =
        lcRes.status === 'fulfilled'
          ? lcRes.value.data?.data?.data || lcRes.value.data?.data || []
          : [];

      const activeLcs: any[] = [];
      const buyersSet = new Set<string>();

      lcData.forEach((lc: any) => {
        if (lc.buyer?.name) {
          buyersSet.add(lc.buyer.name);
        }
        if (lc.status !== 'CANCELLED') {
          activeLcs.push({
            id: lc.id,
            lcNumber: lc.lcNumber,
            buyerName: lc.buyer?.name || 'Unknown Buyer',
            currency: lc.currency || 'USD',
            amount: lc.amount || 0,
            posCount: lc._count?.pos || lc.pos?.length || 0,
            status: lc.status,
          });
        }
      });

      // 4. Stock-Out Challans & Today's Activity
      const stockOutData =
        stockOutRes.status === 'fulfilled'
          ? stockOutRes.value.data?.data?.data || stockOutRes.value.data?.data || []
          : [];

      const pendingChallans: any[] = [];
      let todayStockOutChallans = 0;
      const todayStr = new Date().toISOString().slice(0, 10);

      stockOutData.forEach((so: any) => {
        if (so.status === 'ISSUED') {
          pendingChallans.push({
            id: so.id,
            challanNumber: so.challanNumber,
            buyerName: so.buyer?.name || so.po?.buyer?.name || 'Direct Client',
            destination: so.destination || 'Main Delivery',
            dispatchDate: so.dispatchDate,
            itemsCount: so.itemsCount || so.items?.length || 0,
            status: so.status,
          });
        }

        if (so.dispatchDate && so.dispatchDate.startsWith(todayStr)) {
          todayStockOutChallans++;
        }
      });

      // 5. Movements & Monthly Trends
      const movementsData =
        movementsRes.status === 'fulfilled'
          ? movementsRes.value.data?.data?.data || movementsRes.value.data?.data || []
          : [];

      let todayStockInBatches = 0;
      const monthsMap = new Map<string, { stockIn: number; stockOut: number }>();

      // Initialize past 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mKey = d.toLocaleString('en-US', { month: 'short' });
        monthsMap.set(mKey, { stockIn: 0, stockOut: 0 });
      }

      movementsData.forEach((mov: any) => {
        if (mov.createdAt && mov.createdAt.startsWith(todayStr) && mov.type === 'RECEIVED') {
          todayStockInBatches++;
        }

        if (mov.createdAt) {
          const mKey = new Date(mov.createdAt).toLocaleString('en-US', {
            month: 'short',
          });
          if (monthsMap.has(mKey)) {
            const entry = monthsMap.get(mKey)!;
            if (mov.type === 'RECEIVED' || mov.type === 'RETURN') {
              entry.stockIn += mov.quantity || 0;
            } else if (mov.type === 'SALE' || mov.type === 'DAMAGE') {
              entry.stockOut += mov.quantity || 0;
            }
          }
        }
      });

      const movementTrends = Array.from(monthsMap.entries()).map(
        ([month, vals]) => ({
          month,
          stockIn: vals.stockIn,
          stockOut: vals.stockOut,
        }),
      );

      // 6. Recent Stocks / Batches Overview
      const batchesData =
        batchesRes.status === 'fulfilled'
          ? batchesRes.value.data?.data?.data || batchesRes.value.data?.data || []
          : [];

      const recentStocks = batchesData.map((b: any) => {
        const firstItem = b.batchItems?.[0];
        const p = firstItem?.product;
        const mp = p?.masterProduct;
        const loc = firstItem?.location;
        const locationName = loc
          ? `${loc.warehouse?.name || 'WH'} • ${loc.code || loc.name || 'Location'}`
          : 'Unassigned';

        return {
          id: b.id,
          batchId: b.batch_id || b.batch_number || 'Batch',
          batchNumber: b.batch_number,
          productName: mp?.name || p?.name || 'Master Product',
          material: mp?.material?.name || 'Standard Material',
          colorName: p?.color?.name || p?.color?.code || 'Assorted',
          gender: p?.gender || 'Unisex',
          availableQty:
            b.summary?.totalAvailableQty ??
            b.batchItems?.reduce((acc: number, i: any) => acc + (i.availableQty || 0), 0) ??
            0,
          totalQty:
            b.summary?.totalReceivedQty ??
            b.batchItems?.reduce((acc: number, i: any) => acc + (i.receivedQty || 0), 0) ??
            0,
          packetCount:
            b.summary?.totalPackets ??
            b.batchItems?.reduce((acc: number, i: any) => acc + (i.packetCount || 0), 0) ??
            0,
          locationName,
          poNumber: b.po?.poNumber,
          createdAt: b.createdAt,
        };
      });

      return {
        kpi: {
          totalStockPairs,
          lowStockCount,
          activePoCount: activePos.length,
          poFulfillmentRate,
          activeLcCount: activeLcs.length,
          totalBuyersCount: buyersSet.size,
          todayStockInBatches,
          todayStockOutChallans,
        },
        movementTrends,
        poDistribution,
        activeLcs: activeLcs.slice(0, 5), // Top 5 active
        pendingChallans: pendingChallans.slice(0, 5), // Top 5 pending
        recentStocks: recentStocks.slice(0, 5), // Top 5 recent batches
      };
    },
    refetchInterval: 1000 * 60 * 3, // Auto-refresh every 3 minutes
  });
}
