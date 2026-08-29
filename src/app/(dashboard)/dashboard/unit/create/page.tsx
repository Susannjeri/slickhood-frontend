"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Loader2, ArrowRight, LayoutGrid, KeyRound, Tag, Users, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useApi } from "@/hooks/useApi";
import { useAuthStore } from "@/store/authStore";
import CanProperty from "@/components/auth/CanProperty";
import { originFromLeaseMode } from "@/lib/unitNavigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LeaseMode = "RENT" | "SALE" | "SERVICE_CHARGE";

const LEASE_MODE_OPTIONS: { value: LeaseMode; label: string; description: string; icon: typeof KeyRound }[] = [
  { value: "RENT", label: "Rental Unit", description: "Leased out for recurring rent", icon: KeyRound },
  { value: "SALE", label: "Sale Unit", description: "Listed for a one-off sale", icon: Tag },
  { value: "SERVICE_CHARGE", label: "Homeowner Unit", description: "Owner-occupied, service charge billed", icon: Users },
];

interface PropertyOption { id: number; name: string; }

export default function CreateUnitEntryPage() {
  const router = useRouter();
  const { viewPropertyDetails } = useApi();

  const propertyIds = useAuthStore((s) => s.propertyIds);
  const propertyNames = useAuthStore((s) => s.propertyNames);
  const properties: PropertyOption[] = propertyIds.map((id, i) => ({
    id, name: propertyNames[i] ?? `Property #${id}`,
  }));

  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [leaseMode, setLeaseMode] = useState<LeaseMode | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedPropertyId || !leaseMode) return;
    setLoading(true);
    try {
      const res = await viewPropertyDetails(selectedPropertyId);
      if (res.success && res.data && res.data[0]) {
        const p = res.data[0];
        const nameSlug = p.name.replace(/\s+/g, "-").toLowerCase();
        const origin = originFromLeaseMode(leaseMode);
        router.push(
          `/dashboard/unit/create/${selectedPropertyId}?name=${nameSlug}&currency=${p.currency}&propertyType=${p.type}&leaseMode=${leaseMode}&from=${origin}`
        );
      } else {
        toast.error("Could not load property details. Please try again.");
      }
    } catch (err) {
      console.error("Error loading property details:", err);
      toast.error("Could not load property details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 space-y-5">

      {/* Header */}
      <div className="space-y-1.5">
        <Breadcrumb items={[
          { label: "Properties", href: "/dashboard/property/properties" },
          { label: "Create Unit" },
        ]} />
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#FEE2E2" }}
          >
            <LayoutGrid className="w-5 h-5" style={{ color: "#EF4217" }} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#141130]">Create Unit</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Pick a property and unit type — no need to open the property first.
            </p>
          </div>
        </div>
      </div>

      {properties.length === 0 ? (
        /* ── Empty state: no properties to create a unit for ── */
        <div className="bg-white p-6 rounded-lg border shadow-sm flex flex-col items-center text-center py-12 gap-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#FEE2E2" }}
          >
            <Building2 className="w-8 h-8" style={{ color: "#EF4217" }} />
          </div>
          <h3 className="text-lg font-semibold text-[#141130]">No properties yet</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            You need at least one property before you can create a unit for it.
          </p>
          <Button
            onClick={() => router.push("/dashboard/property/create")}
            className="text-white mt-1"
            style={{ backgroundColor: "#EF4217" }}
          >
            Create Property
          </Button>
        </div>
      ) : (
        <div className="bg-white p-6 sm:p-8 rounded-xl border shadow-sm space-y-6">

          {/* Property */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Property
            </label>
            <Select
              value={selectedPropertyId ? String(selectedPropertyId) : ""}
              onValueChange={(v) => setSelectedPropertyId(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit Type — selectable cards, not a buried dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Unit Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LEASE_MODE_OPTIONS.map((o) => {
                const Icon = o.icon;
                const selected = leaseMode === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setLeaseMode(o.value)}
                    className={cn(
                      "relative flex flex-col items-start gap-2 text-left p-4 rounded-lg border-2 transition-all duration-150",
                      selected
                        ? "border-[#EF4217] bg-[#EF4217]/5"
                        : "border-gray-200 hover:border-[#EF4217]/40 hover:bg-gray-50"
                    )}
                  >
                    {selected && (
                      <span
                        className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "#EF4217" }}
                      >
                        <Check className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: selected ? "#EF4217" : "#F3F4F6" }}
                    >
                      <Icon className={cn("w-4 h-4", selected ? "text-white" : "text-gray-500")} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#141130]">{o.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug">{o.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="pt-1 border-t space-y-3">
            <CanProperty
              propertyId={selectedPropertyId ?? -1}
              permissions={["create_unit"]}
              fallback={
                <div className="space-y-2 pt-4">
                  <Button disabled className="w-full sm:w-auto text-white opacity-50" style={{ backgroundColor: "#EF4217" }}>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  {selectedPropertyId && (
                    <p className="text-xs rounded-md border border-amber-300 bg-amber-50 text-amber-800 px-2.5 py-1.5">
                      You don&apos;t have permission to create units for this property.
                    </p>
                  )}
                </div>
              }
            >
              <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {selectedPropertyId && leaseMode ? (
                  <p className="text-xs text-gray-500">
                    Creating a{" "}
                    <span className="font-semibold text-[#141130]">
                      {LEASE_MODE_OPTIONS.find((o) => o.value === leaseMode)?.label}
                    </span>{" "}
                    for{" "}
                    <span className="font-semibold text-[#141130]">
                      {properties.find((p) => p.id === selectedPropertyId)?.name}
                    </span>
                  </p>
                ) : <span />}
                <Button
                  onClick={handleContinue}
                  disabled={!selectedPropertyId || !leaseMode || loading}
                  className="group w-full sm:w-auto text-white transition-all duration-300 ease-out hover:bg-[#d93712] hover:shadow-[0_0_20px_rgba(239,66,23,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                  style={{ backgroundColor: "#EF4217" }}
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Button>
              </div>
            </CanProperty>
          </div>
        </div>
      )}
    </div>
  );
}
