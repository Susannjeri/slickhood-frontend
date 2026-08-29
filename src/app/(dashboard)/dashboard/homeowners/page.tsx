// app/(dashboard)/dashboard/units/homeowners/page.tsx
"use client";
import UnitTypeListPage from "@/components/unit/UnitTypeListPage";

export default function HomeownersPage() {
  return (
    <UnitTypeListPage
      leaseMode="SERVICE_CHARGE"
      title="Homeowners"
      description="Service-charge units "
      bulkActionLabel="Bulk Invoice"
    />
  );
}