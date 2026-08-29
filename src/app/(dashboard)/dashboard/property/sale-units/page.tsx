// app/(dashboard)/dashboard/units/sale/page.tsx
"use client";
import UnitTypeListPage from "@/components/unit/UnitTypeListPage";

export default function SaleUnitsPage() {
  return (
    <UnitTypeListPage
      leaseMode="SALE"
      title="Sale Units"
      description="Units listed for sale"
    />
  );
}