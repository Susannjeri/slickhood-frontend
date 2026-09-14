"use client";

import RequireRole from "@/components/auth/RequireRole";
import UnitTypeListPage from "@/components/unit/UnitTypeListPage";
import { useAuthStore } from "@/store/authStore";

const roleView = {
  Tenant: {
    leaseMode: "RENT" as const,
    title: "My rental units",
    description: "View every unit currently linked to your tenancy, including its live lease and payment status.",
    allPropertiesLabel: "All rental properties",
  },
  Homeowner: {
    leaseMode: "SERVICE_CHARGE" as const,
    title: "My homeowner units",
    description: "View every home currently linked to your ownership records and its estate onboarding status.",
    allPropertiesLabel: "All estates",
  },
  Buyer: {
    leaseMode: "SALE" as const,
    title: "My sale units",
    description: "View every unit linked to your active purchase journeys and its current sale status.",
    allPropertiesLabel: "All sale properties",
  },
};

export default function MyUnitsPage() {
  const role = useAuthStore(state => state.activeRole?.title) as keyof typeof roleView | undefined;
  const view = role ? roleView[role] : undefined;

  return (
    <RequireRole roles={["Tenant", "Homeowner", "Buyer"]} permissions={["view_unit"]}>
      {view ? (
        <UnitTypeListPage
          leaseMode={view.leaseMode}
          title={view.title}
          description={view.description}
          allPropertiesLabel={view.allPropertiesLabel}
        />
      ) : null}
    </RequireRole>
  );
}
