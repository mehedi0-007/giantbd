'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardData } from '@/types/dashboard';

const LOW_STOCK_THRESHOLD = 30; // Business rule confirmed by user

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard-data'],
    queryFn: async () => {
      // Execute all 5 data queries in parallel for high performance
      const [stockRes, poRes, lcRes, stockOutRes, movementsRes] =
        await Promise.allSettled([
          api.get('/inventory/stock', { params: { per_page: 500 } }),
          api.get('/pos', { params: { per_page: 200 } }),
          api.get('/lcs', { params: { per_page: 200 } }),
          api.get('/inventory/stock-out', { params: { per_page: 100 } }),
          api.get('/inventory/movements', { params: { per_page: 500 } }),
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

      // 3. Letters of Credit (LC) Expiry
      const lcData =
        lcRes.status === 'fulfilled'
          ? lcRes.value.data?.data?.data || lcRes.value.data?.data || []
          : [];

      const now = Date.now();
      const expiringLcs: any[] = [];
      let expiringLcsCount = 0;
      let urgentLcsCount = 0;

      lcData.forEach((lc: any) => {
        if (lc.status === 'CANCELLED' || lc.status === 'FULFILLED') return;
        if (!lc.expiryDate) return;

        const expiryTime = new Date(lc.expiryDate).getTime();
        const diffDays = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) {
          expiringLcsCount++;
          if (diffDays <= 15) {
            urgentLcsCount++;
          }
          expiringLcs.push({
            id: lc.id,
            lcNumber: lc.lcNumber,
            buyerName: lc.buyer?.name || 'Unknown Buyer',
            expiryDate: lc.expiryDate,
            daysRemaining: diffDays,
            status: lc.status,
          });
        }
      });

      // Sort by urgency (least days remaining first)
      expiringLcs.sort((a, b) => a.daysRemaining - b.daysRemaining);

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

      return {
        kpi: {
          totalStockPairs,
          lowStockCount,
          activePoCount: activePos.length,
          poFulfillmentRate,
          expiringLcsCount,
          urgentLcsCount,
          todayStockInBatches,
          todayStockOutChallans,
        },
        movementTrends,
        poDistribution,
        expiringLcs: expiringLcs.slice(0, 5), // Top 5 urgent
        pendingChallans: pendingChallans.slice(0, 5), // Top 5 pending
      };
    },
    refetchInterval: 1000 * 60 * 3, // Auto-refresh every 3 minutes
  });
}
