export interface KpiMetrics {
  totalStockPairs: number;
  lowStockCount: number;
  activePoCount: number;
  poFulfillmentRate: number;
  activeLcCount: number;
  totalBuyersCount: number;
  todayStockInBatches: number;
  todayStockOutChallans: number;
}

export interface MovementTrendItem {
  month: string;
  stockIn: number;
  stockOut: number;
}

export interface PoStatusDistribution {
  name: string;
  count: number;
  color: string;
}

export interface ActiveLcItem {
  id: string;
  lcNumber: string;
  buyerName: string;
  currency?: string;
  amount?: number;
  posCount: number;
  status: string;
}

export interface PendingChallan {
  id: string;
  challanNumber: string;
  buyerName?: string;
  destination?: string;
  dispatchDate: string;
  itemsCount: number;
  status: string;
}

export interface RecentStockBatch {
  id: string;
  batchId: string;
  batchNumber?: string;
  productName: string;
  material?: string;
  colorName?: string;
  gender?: string;
  availableQty: number;
  totalQty: number;
  packetCount: number;
  locationName: string;
  poNumber?: string;
  createdAt: string;
}

export interface DashboardData {
  kpi: KpiMetrics;
  movementTrends: MovementTrendItem[];
  poDistribution: PoStatusDistribution[];
  activeLcs: ActiveLcItem[];
  pendingChallans: PendingChallan[];
  recentStocks: RecentStockBatch[];
}
