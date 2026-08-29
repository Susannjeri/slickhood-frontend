// app/(dashboard)/dashboard/units/rentals/page.tsx
"use client";
import UnitTypeListPage from "@/components/unit/UnitTypeListPage";

export default function RentalsPage() {
  return (
    <UnitTypeListPage
      leaseMode="RENT"
      title="Rentals"
      description="Rental units"
    />
  );
}