"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Invoice, InvoiceFilters, InvoiceListItem,
  InvoiceStatus, SearchOption, transformInvoice,
} from "@/types/invoice";
import { InvoiceCard } from "./InvoiceCard";
import { SearchCombobox } from "./SearchCombobox";
import Can from "@/components/auth/Can";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { Loader2, SlidersHorizontal, X } from "lucide-react";

type StatusFilter = "ALL" | InvoiceStatus;

interface Props {
  selectedId: number | null;
  onSelect: (invoice: Invoice) => void;
  autoSelectFirst?: boolean; // desktop: true, mobile: false
  onPaymentSuccess: () => void;
  onRefetchReady (fn: () => void): void; // called when the internal refetch function is ready to be used by parent
}

export function InvoiceList({ selectedId, onSelect, autoSelectFirst = true, onPaymentSuccess, onRefetchReady }: Props) {
  const {
    handleListLeases,
    handleSearchProperties,
    handleSearchUnits,
    handleSearchTenants,
    handleSearchLandlords,
  } = useApi();

  // ─── Data state ────────────────────────────────────────────────────────────
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [page, setPage]           = useState(0);
  const [hasMore, setHasMore]     = useState(true);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Tracks which filters produced the current invoice list.
  // Used to show specific empty messages and pass correct filters
  // to infinite scroll fetches.
  const [appliedFilters, setAppliedFilters] = useState<InvoiceFilters>({});
  const appliedFiltersRef = useRef<InvoiceFilters>({});

  // ─── Filter state ──────────────────────────────────────────────────────────
  const [searchInput, setSearchInput]   = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [stagedProperty, setStagedProperty] = useState<SearchOption | null>(null);
  const [stagedUnit, setStagedUnit]         = useState<SearchOption | null>(null);
  const [stagedTenant, setStagedTenant]     = useState<SearchOption | null>(null);
  const [stagedLandlord, setStagedLandlord] = useState<SearchOption | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef  = useRef(false);
  const hasMoreRef  = useRef(true);

  // ─── Combobox cache ────────────────────────────────────────────────────────
  // Structured as a Map keyed by a cache key string.
  // Lives for the lifetime of this component — no external persistence needed.
  // Key format:
  //   properties: "properties::{query}"
  //   tenants:    "tenants::{query}"
  //   landlords:  "landlords::{query}"
  //   units:      "units::{propertyId}::{query}"
  const comboCache = useRef<Map<string, SearchOption[]>>(new Map());

  const withCache = async (
    key: string,
    fetcher: () => Promise<SearchOption[]>
  ): Promise<SearchOption[]> => {
    if (comboCache.current.has(key)) {
      return comboCache.current.get(key)!; // return cached instantly
    }
    const results = await fetcher();
    comboCache.current.set(key, results);
    return results;
  };

  // Wrapped search functions — each builds a cache key and delegates to withCache
  const searchProperties = (q: string) =>
    withCache(`properties::${q}`, () =>
      handleSearchProperties({ search: q }).then(r => r.data)
    );

  const searchTenants = (q: string) =>
    withCache(`tenants::${q}`, () =>
      handleSearchTenants({ search: q }).then(r => r.data)
    );

  const searchLandlords = (q: string) =>
    withCache(`landlords::${q}`, () =>
      handleSearchLandlords({ search: q }).then(r => r.data)
    );

  // Units cache key includes propertyId because the same query "A1"
  // means different things under different properties
  const searchUnits = (q: string) =>
    withCache(`units::${stagedProperty?.id}::${q}`, () =>
      handleSearchUnits({ search: q, propertyId: stagedProperty?.id }).then(r => r.data)
    );

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchPage = useCallback(async (
    pageNumber: number,
    replace: boolean,
    filters: InvoiceFilters
  ) => {
    // On a replace fetch (new filters applied), we don't guard on hasMoreRef
    // because we always want to fetch fresh data regardless
    if (loadingRef.current && !replace) return;
    if (!hasMoreRef.current && !replace) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    // Clear immediately on replace so user sees loading state, not stale data
    if (replace) {
      setInvoices([]);
    }

    try {
      const res = await handleListLeases({ page: pageNumber, size: 10, ...filters });
      const transformed: Invoice[] = res.data.map(
        (item: InvoiceListItem) => transformInvoice(item)
      );

      setInvoices(prev => replace ? transformed : [...prev, ...transformed]);

      if (replace && transformed.length > 0 && autoSelectFirst) {
        onSelect(transformed[0]);
      }

      const noMorePages = pageNumber + 1 >= res.totalPages;
      setHasMore(!noMorePages);
      hasMoreRef.current = !noMorePages;

    } catch {
      setError("Failed to load invoices. Please try again.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [handleListLeases, onSelect]);

  // ─── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPage(0, true, {});
  }, []);

  // ─── Infinite scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage(prev => {
            const nextPage = prev + 1;
            // Use appliedFiltersRef (not state) to avoid stale closure
            fetchPage(nextPage, false, appliedFiltersRef.current);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchPage]);

   // ── Register refetch with parent ──────────────────────────────────────────
  // Runs once on mount — gives InvoicesPage a stable handle to trigger a
  // fresh page-0 fetch with current applied filters after a payment succeeds.
  useEffect(() => {
    onRefetchReady(() => {
      hasMoreRef.current = true;
      fetchPage(0, true, appliedFiltersRef.current);
    });
  }, []);

  // ─── Apply filters ─────────────────────────────────────────────────────────
  const handleApplyFilters = () => {
    const filters: InvoiceFilters = {
      propertyId:  stagedProperty?.id,
      unitId:      stagedUnit?.id,
      tenantId:    stagedTenant?.id,
      landlordId:  stagedLandlord?.id,
    };
    // Update both state and ref — state for UI, ref for IntersectionObserver closure
    setAppliedFilters(filters);
    appliedFiltersRef.current = filters;
    setPage(0);
    hasMoreRef.current = true;
    fetchPage(0, true, filters);
  };

  const handleClearAdvanced = () => {
    setStagedProperty(null);
    setStagedUnit(null);
    setStagedTenant(null);
    setStagedLandlord(null);
    const empty = {};
    setAppliedFilters(empty);
    appliedFiltersRef.current = empty;
    setPage(0);
    hasMoreRef.current = true;
    fetchPage(0, true, empty);
  };

  const handlePropertyChange = (option: SearchOption | null) => {
    setStagedProperty(option);
    setStagedUnit(null);
  };

  const handleTenantChange = (option: SearchOption | null) => {
    setStagedTenant(option);
    if (option) setStagedLandlord(null); // landlord disabled when tenant picked
  };

  const handleLandlordChange = (option: SearchOption | null) => {
    setStagedLandlord(option);
    if (option) setStagedTenant(null); // tenant disabled when landlord picked
  };

  const appliedFilterCount = Object.values(appliedFilters).filter(Boolean).length;

  // ─── Client-side filters ───────────────────────────────────────────────────
  const filtered = invoices.filter(inv => {
    const matchStatus = statusFilter === "ALL" || inv.status === statusFilter;
    const matchSearch =
      activeSearch === "" ||
      inv.tenantName.toLowerCase().includes(activeSearch.toLowerCase()) ||
      inv.ref.toLowerCase().includes(activeSearch.toLowerCase()) ||
      inv.propertyName.toLowerCase().includes(activeSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Build a specific empty message based on what filters are active
  const emptyMessage = (() => {
    if (activeSearch) return `No invoices matching "${activeSearch}".`;
    if (appliedFilters.unitId) return "No invoices found for this unit.";
    if (appliedFilters.propertyId) return "No invoices found for this property.";
    if (appliedFilters.tenantId) return "No invoices found for this tenant.";
    if (appliedFilters.landlordId) return "No invoices found for this landlord.";
    return "No invoices found.";
  })();

  const handleSearch  = () => setActiveSearch(searchInput);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };
  const handleClearSearch = () => {
    setSearchInput("");
    setActiveSearch("");
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#141130]">Invoices</h2>
        {appliedFilterCount > 0 && (
          <span className="text-xs bg-[#EF4217] text-white px-2 py-0.5 rounded-full font-semibold">
            {appliedFilterCount} filter{appliedFilterCount > 1 ? "s" : ""} active
          </span>
        )}
      </div>

      {/* Status toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-3">
        {(["ALL", "PAID", "UNPAID"] as StatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`
              flex-1 py-1.5 text-xs font-semibold rounded-md transition-all
              ${statusFilter === s
                ? "bg-white text-[#141130] shadow-sm"
                : "text-gray-400 hover:text-gray-600"
              }
            `}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Text search */}
      <div className="mb-3 space-y-2">
        <div className="flex gap-2">
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Name, ref, or property..."
            className="h-9 text-sm"
          />
          <Button
            onClick={handleSearch}
            className="h-9 px-4 bg-[#EF4217] hover:bg-[#d63a13] text-white text-sm shrink-0"
          >
            Search
          </Button>
        </div>
        {activeSearch && (
          <button onClick={handleClearSearch} className="text-xs text-gray-400 hover:text-gray-600 underline">
            Clear search
          </button>
        )}
      </div>

      {/* Advanced filters toggle */}
      <button
        onClick={() => setShowAdvanced(prev => !prev)}
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-[#EF4217] transition-colors mb-3 self-start"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Advanced filters
        {appliedFilterCount > 0 && !showAdvanced && (
          <span className="text-[#EF4217]">({appliedFilterCount} active)</span>
        )}
      </button>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="border border-gray-100 rounded-xl p-4 mb-3 bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <SearchCombobox
              label="Property"
              placeholder="Search properties..."
              value={stagedProperty}
              onChange={handlePropertyChange}
              onSearch={searchProperties}
            />
            <SearchCombobox
              label="Unit"
              placeholder={stagedProperty ? "Search units..." : "Select property first"}
              value={stagedUnit}
              onChange={setStagedUnit}
              disabled={!stagedProperty}
              onSearch={searchUnits}
            />
          </div>

          <Can roles={["Superadmin"]}>
            <div className="grid grid-cols-2 gap-3">
              <SearchCombobox
                label="Tenant"
                placeholder="Search tenants..."
                value={stagedTenant}
                onChange={handleTenantChange}
                onSearch={searchTenants}
                disabled={!!stagedLandlord}
              />
              <SearchCombobox
                label="Landlord"
                placeholder="Search landlords..."
                value={stagedLandlord}
                onChange={handleLandlordChange}
                onSearch={searchLandlords}
                disabled={!!stagedTenant}
              />
            </div>
          </Can>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleApplyFilters}
              className="flex-1 h-8 text-xs bg-[#EF4217] hover:bg-[#d63a13] text-white"
            >
              Apply filters
            </Button>
            {appliedFilterCount > 0 && (
              <Button
                onClick={handleClearAdvanced}
                variant="outline"
                className="h-8 text-xs px-3 gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Results summary */}
      {(activeSearch || statusFilter !== "ALL" || appliedFilterCount > 0) && (
        <p className="text-xs text-gray-400 mb-3">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          {activeSearch && <> for &ldquo;{activeSearch}&rdquo;</>}
          {statusFilter !== "ALL" && <> &middot; {statusFilter}</>}
          {appliedFilterCount > 0 && <> &middot; {appliedFilterCount} advanced filter{appliedFilterCount > 1 ? "s" : ""}</>}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          {error}
        </div>
      )}

      {/* Cards */}
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
        {filtered.map(inv => (
          <InvoiceCard
            key={inv.id}
            invoice={inv}
            isSelected={selectedId === inv.id}
            onClick={() => onSelect(inv)}
            onPaymentSuccess={onPaymentSuccess}
          />
        ))}

        {!loading && filtered.length === 0 && !error && (
          <p className="text-sm text-gray-400 text-center mt-8">{emptyMessage}</p>
        )}

        {hasMore && !activeSearch && statusFilter === "ALL" && (
          <div ref={sentinelRef} className="h-4 w-full" />
        )}

        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-[#EF4217]" />
          </div>
        )}

        {!hasMore && invoices.length > 0 && !activeSearch && statusFilter === "ALL" && (
          <p className="text-xs text-gray-300 text-center py-2">All invoices loaded</p>
        )}
      </div>
    </div>
  );
}