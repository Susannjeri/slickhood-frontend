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
  totalOccupiedUnits?: number;
  totalPendingLeases?: number;
  totalUnPaidInvoices?: number;
  totalPaidInvoices?: number;
  totalManagedUnits?: number;
  totalManagedProperties?: number;
  totalPendingLeaseSigns?: number;
  totalInsideProperty?: number;
  totalDeliveryToday?: number;
  totalContractorsToday?: number;
  totalGuestsToday?: number;
  bookingsWithinCurrentMonth?: number;
  bookingsWithinPreviousMonth?: number;
  averageRating?: number;
  mostRecentRating?: number;
  inActiveUserPercent?: number;
  userLoggedInWithinCurrentMonth?: number;
  totalActiveProperties?: number;
  totalSubscriptionPaidWithinCurrentMonth?: number;
}

export interface DashboardTotalsResponse {
  success: boolean;
  code: string;
  description: string;
  data: DashboardTotals[];
}
