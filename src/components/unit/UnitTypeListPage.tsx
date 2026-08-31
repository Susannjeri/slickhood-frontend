"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, Plus, Loader2, Home,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useApi } from "@/hooks/useApi";
import { usePropertyMetadata } from "@/app/(dashboard)/dashboard/property/propertyMetadata";
import { useAuthStore } from "@/store/authStore";
import Can from "@/components/auth/Can";
import CanProperty from "@/components/auth/CanProperty";
import { originFromLeaseMode } from "@/lib/unitNavigation";

// ─── Types ──────────────────────────────────────────────────────────────
type LeaseMode = "SALE" | "RENT" | "SERVICE_CHARGE";

interface MeasurementUnits { id: number; name: string; }

interface Unit {
  propertyId: number;
  ref: string;
  unitType: number | string;
  size: number;
  measurementUnits: MeasurementUnits;
  leaseMode: string;
  price: number;
  currency: string;
  occupied: boolean;
  thumbnail: string;
  unitId: number;
}

interface PropertyOption {
  id: number;
  name: string;
}

interface UnitTypeListPageProps {
  leaseMode: LeaseMode;
  title: string;
  description: string;
  // e.g. "Bulk Invoice" for SERVICE_CHARGE — accepted for a future toolbar
  // action, not yet rendered anywhere.
  bulkActionLabel?: string;
}

// ─── Copy config per leaseMode (labels only — no business logic) ───────
const MODE_COPY: Record<LeaseMode, { empty: string; emptyAll: string; addCta: string }> = {
  SALE: {
    empty: "No sale units found for this property.",
    emptyAll: "No sale units found across your properties.",
    addCta: "Add Sale Unit",
  },
  RENT: {
    empty: "No rental units found for this property.",
    emptyAll: "No rental units found across your properties.",
    addCta: "Add Rental Unit",
  },
  SERVICE_CHARGE: {
    empty: "No homeowners found for this property.",
    emptyAll: "No homeowners found across your properties.",
    addCta: "Add Home",
  },
};

export default function UnitTypeListPage({
  leaseMode,
  title,
  description,
  bulkActionLabel,
}: UnitTypeListPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getUnits, viewPropertyDetails } = useApi();
  const { getUnitTypes, resolveUnitTypeLabel } = usePropertyMetadata();

  const propertyIds = useAuthStore((s) => s.propertyIds);
  const propertyNames = useAuthStore((s) => s.propertyNames);

  const properties: PropertyOption[] = propertyIds.map((id, i) => ({
  id, name: propertyNames[i] ?? `Property #${id}`,
  }));

  // Every "view unit"/"add unit" link from this page must say where it came
  // from, since Unit Details/Create no longer have a single hardcoded return
  // path now that they're reachable from Property Details AND from here.
  const origin = originFromLeaseMode(leaseMode);

  // Selected property state
  const requestedPropertyId = Number(searchParams.get("propertyId"));
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(() =>
    Number.isSafeInteger(requestedPropertyId) && propertyIds.includes(requestedPropertyId)
      ? requestedPropertyId
      : null
  );
  const [selectedProperty, setSelectedProperty] = useState<{
    name: string; currency: string; type: string;
  } | null>(null);
  const [propertyLoading, setPropertyLoading] = useState(false);

  // Units state
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsPage, setUnitsPage] = useState(0);
  const [unitsPageSize, setUnitsPageSize] = useState(10);
  const [unitsTotalPages, setUnitsTotalPages] = useState(0);
  const [unitsTotalElements, setUnitsTotalElements] = useState(0);
  const [unitsSearch, setUnitsSearch] = useState("");
  const [debouncedUnitsSearch, setDebouncedUnitsSearch] = useState("");
  const [unitsSortField, setUnitsSortField] = useState("id");
  const [unitsSortOrder, setUnitsSortOrder] = useState<"asc" | "desc">("desc");
  const [unitImageCache, setUnitImageCache] = useState<Record<string, string>>({});

  const copy = MODE_COPY[leaseMode];

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUnitsSearch(unitsSearch);
      setUnitsPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [unitsSearch]);

  // When property changes: fetch its details (needed for Add Unit + type
  // labels), reset pagination. When cleared back to "All Properties"
  // (selectedPropertyId null), there's no single property to fetch
  // metadata for — units still load, just via the other effect below.
  useEffect(() => {
    // Reset pagination AND any pending/applied search — a filter typed while
    // browsing one scope shouldn't silently carry over into the next.
    setUnitsPage(0);
    setUnitsSearch("");
    setDebouncedUnitsSearch("");

    if (!selectedPropertyId) {
      setSelectedProperty(null);
      return;
    }

    const loadPropertyMeta = async () => {
      try {
        setPropertyLoading(true);
        const res = await viewPropertyDetails(selectedPropertyId);
        if (res.success && res.data && res.data[0]) {
          const p = res.data[0];
          setSelectedProperty({ name: p.name, currency: p.currency, type: p.type });
          await getUnitTypes(p.type); // needed for resolveUnitTypeLabel
        }
      } catch (err) {
        console.error("Error loading property meta:", err);
      } finally {
        setPropertyLoading(false);
      }
    };

    loadPropertyMeta();
  }, [selectedPropertyId]);

  // Load units whenever relevant params change — fires with or without a
  // selected property; loadUnits itself decides whether to scope the call.
  useEffect(() => {
    loadUnits();
  }, [
    selectedPropertyId,
    unitsPage,
    unitsPageSize,
    debouncedUnitsSearch,
    unitsSortField,
    unitsSortOrder,
  ]);

  // Guards against out-of-order responses: e.g. switching property A -> B
  // fires two requests, and if A's happens to resolve after B's, this drops
  // A's stale response instead of overwriting B's already-rendered rows.
  const loadUnitsRequestId = useRef(0);

  const loadUnits = async () => {
    const requestId = ++loadUnitsRequestId.current;
    try {
      setUnitsLoading(true);
      // propertyId is omitted (not sent as 0/null) when no property is
      // selected — that's what makes this an "all properties for this
      // leaseMode" query. See fetchUnitList in api.ts.
      const response = await getUnits({
        page: unitsPage,
        size: unitsPageSize,
        sort: `${unitsSortField},${unitsSortOrder}`,
        ...(selectedPropertyId ? { propertyId: selectedPropertyId } : {}),
        search: debouncedUnitsSearch,
        leaseMode, // hardcoded per page, passed in as a prop
      });

      if (requestId !== loadUnitsRequestId.current) return; // superseded

      const data: Unit[] = response.data || [];
      setUnits(data);
      setUnitsTotalPages(response.totalPages || 0);
      setUnitsTotalElements(response.totalElements || 0);

      data.forEach((unit) => {
        if (unit.thumbnail && !unitImageCache[unit.thumbnail]) {
          setUnitImageCache((prev) => ({ ...prev, [unit.thumbnail]: unit.thumbnail }));
        }
      });
    } catch (err) {
      if (requestId !== loadUnitsRequestId.current) return; // superseded
      console.error("Error loading units:", err);
    } finally {
      if (requestId === loadUnitsRequestId.current) setUnitsLoading(false);
    }
  };

  const handleUnitsSort = (value: string) => {
    const [field, order] = value.split("-");
    setUnitsSortField(field);
    setUnitsSortOrder(order as "asc" | "desc");
    setUnitsPage(0);
  };

  // In "All Properties" mode each row can belong to a different property,
  // so the propertyId must come from the row itself, not the (null)
  // selection — selectedPropertyId only wins when it's actually set.
  const handleViewUnit = (unit: Unit) => {
    const propertyId = selectedPropertyId ?? unit.propertyId;
    router.push(`/dashboard/unit/details/${unit.unitId}?p=${propertyId}&from=${origin}`);
  };

  const handleAddUnit = () => {
    if (!selectedProperty || !selectedPropertyId) return;
    const nameSlug = selectedProperty.name.replace(/\s+/g, "-").toLowerCase();
    router.push(
      `/dashboard/unit/create/${selectedPropertyId}?name=${nameSlug}&currency=${selectedProperty.currency}&propertyType=${selectedProperty.type}&leaseMode=${leaseMode}&from=${origin}`
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-5">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Breadcrumb items={[{ label: title }]} />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#141130]">{title}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{description}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Can permissions={["create_property"]}>
              <Button
                onClick={() => router.push("/dashboard/property/create")}
                className="group relative flex items-center px-5 py-2.5 text-white font-medium rounded-lg transition-all duration-300 ease-out hover:bg-[#d93712] hover:shadow-[0_0_20px_rgba(239,66,23,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EF4217]"
                style={{ backgroundColor: "#EF4217" }}
              >
                <Plus className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
                <span>Create Property</span>
                <span className="absolute inset-0 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </Button>
            </Can>
            <CanProperty propertyId={selectedPropertyId ?? -1} permissions={["create_unit"]}>
              <Button
                size="sm"
                className="group gap-1.5 text-xs text-white transition-all duration-200 ease-out hover:shadow-[0_0_16px_rgba(239,66,23,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                style={{ backgroundColor: "#EF4217" }}
                onClick={handleAddUnit}
                disabled={!selectedPropertyId || propertyLoading}
              >
                <Plus className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
                {copy.addCta}
              </Button>
            </CanProperty>
          </div>
        </div>
      </div>

      {/* ── Unified filter bar ───────────────────────────────────────────
          Property picker + search + sort + page size + status all live in
          one bar — used to be two separate bars, which read as disconnected
          filter groups instead of one filter set. */}
      <div className="bg-white p-4 rounded-lg border flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-2 w-full sm:w-auto sm:shrink-0">
          <Home className="w-4 h-4 text-gray-400 shrink-0" />
          <Select
            value={selectedPropertyId ? String(selectedPropertyId) : "all"}
            onValueChange={(v) => setSelectedPropertyId(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {propertyLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search units..."
            value={unitsSearch}
            onChange={(e) => setUnitsSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={`${unitsSortField}-${unitsSortOrder}`}
          onValueChange={handleUnitsSort}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="id-desc">Newest First</SelectItem>
            <SelectItem value="id-asc">Oldest First</SelectItem>
            <SelectItem value="uniqueRef-asc">Reference (A-Z)</SelectItem>
            <SelectItem value="price-asc">Price (Low to High)</SelectItem>
            <SelectItem value="price-desc">Price (High to Low)</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={unitsPageSize.toString()}
          onValueChange={(v) => { setUnitsPageSize(Number(v)); setUnitsPage(0); }}
        >
          <SelectTrigger className="w-full sm:w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50 border-b">
                <TableHead className="w-16 pl-4" />
                <TableHead className="font-semibold text-[#141130] min-w-[140px]">Unit Ref</TableHead>
                <TableHead className="font-semibold text-[#141130]">Type</TableHead>
                <TableHead className="font-semibold text-[#141130]">Size</TableHead>
                <TableHead className="font-semibold text-[#141130]">Price</TableHead>
                <TableHead className="font-semibold text-[#141130]">Status</TableHead>
                <TableHead className="font-semibold text-[#141130] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unitsLoading && units.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : units.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-gray-400">
                    {selectedPropertyId ? copy.empty : copy.emptyAll}
                  </TableCell>
                </TableRow>
              ) : (
                units.map((unit) => (
                  <TableRow
                    key={unit.unitId}
                    onClick={() => handleViewUnit(unit)}
                    className="cursor-pointer hover:bg-[#EF4217]/5 border-b last:border-0 group transition-colors"
                  >
                    <TableCell className="pl-4 py-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {unitImageCache[unit.thumbnail] ? (
                          <img
                            src={unitImageCache[unit.thumbnail]}
                            alt={unit.ref}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <span className="font-bold text-[#141130] group-hover:text-[#EF4217] transition-colors">
                        {unit.ref}
                      </span>
                    </TableCell>

                    <TableCell className="py-3">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap"
                        style={{ backgroundColor: "#EF4217" }}
                      >
                        {resolveUnitTypeLabel(String(unit.unitType))}
                      </span>
                    </TableCell>

                    <TableCell className="py-3">
                      <span className="text-sm text-gray-600">
                        {unit.size} {unit.measurementUnits?.name || ""}
                      </span>
                    </TableCell>

                    <TableCell className="py-3">
                      <span className="text-sm font-semibold" style={{ color: "#EF4217" }}>
                        {unit.currency} {unit.price}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">/{unit.leaseMode}</span>
                    </TableCell>

                    <TableCell className="py-3">
                      <span
                        className={cn(
                          "inline-flex px-2 py-0.5 text-xs font-medium rounded-full",
                          unit.occupied ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                        )}
                      >
                        {unit.occupied ? "Occupied" : "Available"}
                      </span>
                    </TableCell>

                    <TableCell className="py-3 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-sm font-medium transition-all duration-150 hover:bg-[#EF4217]/10 active:scale-95"
                          style={{ color: "#EF4217" }}
                          onClick={() => handleViewUnit(unit)}
                        >
                          View
                        </Button>
                        <CanProperty propertyId={selectedPropertyId ?? unit.propertyId} permissions={["edit_unit"]}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-sm font-medium text-gray-600 transition-all duration-150 hover:text-[#141130] hover:bg-gray-100 active:scale-95"
                            onClick={() =>
                              router.push(
                                `/dashboard/unit/edit/${unit.unitId}?p=${selectedPropertyId ?? unit.propertyId}&from=${origin}`
                              )
                            }
                          >
                            Edit
                          </Button>
                        </CanProperty>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination footer */}
        {units.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3 border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-medium">{unitsPage * unitsPageSize + 1}</span> to{" "}
              <span className="font-medium">
                {Math.min((unitsPage + 1) * unitsPageSize, unitsTotalElements)}
              </span>{" "}
              of <span className="font-medium">{unitsTotalElements}</span> {title.toLowerCase()}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setUnitsPage(0)} disabled={unitsPage === 0}>
                First
              </Button>
              <Button variant="outline" size="sm" onClick={() => setUnitsPage(unitsPage - 1)} disabled={unitsPage === 0}>
                Previous
              </Button>
              <span className="px-3 py-1 text-sm">
                Page <span className="font-medium">{unitsPage + 1}</span> of{" "}
                <span className="font-medium">{unitsTotalPages}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUnitsPage(unitsPage + 1)}
                disabled={unitsPage >= unitsTotalPages - 1}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUnitsPage(unitsTotalPages - 1)}
                disabled={unitsPage >= unitsTotalPages - 1}
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
