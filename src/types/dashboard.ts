// ─── API raw shapes ───────────────────────────────────────────────────────────

export interface DashboardTotals {
  totalProperties?: number;
  totalUnits?: number;
  activeTenants?: number;
  monthlyRevenue?: number;
  role?: string;
  primaryCount?: number;
  secondaryCount?: number;
  pendingActions?: number;
  completedCount?: number;
  primaryLabel?: string;
  secondaryLabel?: string;
  pendingLabel?: string;
  completedLabel?: string;
}

export interface DashboardTotalsResponse {
  success: boolean;
  code: string;
  description: string;
  data: DashboardTotals[];
}
