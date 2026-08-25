export interface KpiMetrics {
  totalStockPairs: number;
  lowStockCount: number;
  activePoCount: number;
  poFulfillmentRate: number;
  expiringLcsCount: number;
  urgentLcsCount: number;
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

export interface ExpiringLc {
  id: string;
  lcNumber: string;
  buyerName: string;
  expiryDate: string;
  daysRemaining: number;
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

export interface DashboardData {
  kpi: KpiMetrics;
  movementTrends: MovementTrendItem[];
  poDistribution: PoStatusDistribution[];
  expiringLcs: ExpiringLc[];
  pendingChallans: PendingChallan[];
}
