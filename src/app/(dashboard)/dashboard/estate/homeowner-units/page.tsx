"use client";

import UnitTypeListPage from "@/components/unit/UnitTypeListPage";

export default function HomeownerUnitsPage() {
  return (
    <UnitTypeListPage
      leaseMode="SERVICE_CHARGE"
      title="Homeowner Units"
      description="Homes configured for estate management and service-charge operations."
      scopePropertiesToUnitMode
      allPropertiesLabel="All homeowner estates"
    />
  );
}
