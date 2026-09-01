import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuthStore } from "@/store/authStore";
import { DashboardTotals, DashboardTotalsResponse } from "@/types/dashboard";
import { apiErrorMessage } from "@/lib/api-error";
import { affiliateDashboard, type AffiliateDashboard } from "@/services/affiliate";
import { wealthService } from "@/services/wealth.service";
import type { WealthDashboard } from "@/types/wealth";
import { envelopeItem } from "@/lib/api-envelope";

// Mirrors the shape of usePropertyMetadata.ts — a small stateful hook built
// on top of useApi()'s plain handleGetDashboardTotals wrapper, since useApi
// itself only ever returns thin fetch-and-return functions, never state.
export function useDashboardTotals(refetchKey = 0) {
  const { handleGetDashboardTotals } = useApi();
  const activeRole = useAuthStore((s) => s.activeRole);

  const [totals, setTotals]   = useState<DashboardTotals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const role = activeRole?.title;
    if (!role) return; // no active role yet (not logged in / still resolving)

    let cancelled = false;

    const fetchTotals = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiRole = role.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[\s-]+/g, "_").toUpperCase();
        if (apiRole === "AFFILIATE") {
          const value = envelopeItem<AffiliateDashboard | null>(await affiliateDashboard(), null);
          if (!cancelled && value) setTotals({role: apiRole, primaryCount: value.totalReferrals, secondaryCount: value.conversions, pendingActions: value.availableBalance, completedCount: value.lifetimeEarnings, primaryLabel: "Referrals", secondaryLabel: "Conversions", pendingLabel: `Available earnings (${value.profile.currency})`, completedLabel: `Lifetime earnings (${value.profile.currency})`});
          else if (!cancelled) setError("Affiliate dashboard data is unavailable.");
          return;
        }
        if (apiRole === "ASSET_PORTFOLIO_MANAGER") {
          const value = envelopeItem<WealthDashboard | null>(await wealthService.dashboard(), null);
          if (!cancelled && value) setTotals({role: apiRole, primaryCount: value.summary.assetCount, secondaryCount: value.summary.netWorth, pendingActions: value.summary.overdueDeadlines, completedCount: value.goalProgress.filter(goal => goal.progressPercent >= 100).length, primaryLabel: "Assets", secondaryLabel: `Net worth (${value.summary.currency})`, pendingLabel: "Overdue deadlines", completedLabel: "Goals achieved"});
          else if (!cancelled) setError("Wealth dashboard data is unavailable.");
          return;
        }
        const res = await handleGetDashboardTotals(apiRole) as DashboardTotalsResponse;
        if (cancelled) return;

        // Envelope came back with success: false (e.g. S0013 "Invalid field
        // data type") — surface the backend's own description, not a generic
        // message; `data` in that case holds error strings, not totals.
        if (!res?.success) {
          setTotals(null);
          setError(res?.description || "Failed to load dashboard totals.");
          return;
        }

        const data = Array.isArray(res.data) ? res.data[0] ?? null : null;
        setTotals(data);
      } catch (err: unknown) {
        if (cancelled) return;
        setTotals(null);
        setError(apiErrorMessage(err, "Failed to load dashboard totals."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTotals();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRole?.title, refetchKey]);

  return { totals, loading, error };
}
