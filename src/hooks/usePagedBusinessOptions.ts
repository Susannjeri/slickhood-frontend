"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPropertyList, fetchUnitList } from "@/lib/api";

export type BusinessPropertyOption = { id: number; name: string; managementMode?: string };
export type BusinessUnitOption = {
  unitId: number;
  propertyId: number;
  ref: string;
  unitType?: string;
  propertyType?: string;
  size?: number;
  measurementUnits?: { id?: number; name?: string };
  currency?: string;
  price?: number;
  leaseMode?: string;
  occupied?: boolean;
  advertise?: boolean;
};

function mergeById<T>(current: T[], incoming: T[], id: (item: T) => number) {
  const values = new Map(current.map(item => [id(item), item]));
  incoming.forEach(item => values.set(id(item), item));
  return Array.from(values.values());
}

export function usePagedBusinessProperties(
  enabled: boolean,
  managementMode?: "RENTAL" | "SALE" | "SERVICE_CHARGE",
  initialItems: BusinessPropertyOption[] = [],
  unitLeaseMode?: "RENT" | "SALE" | "SERVICE_CHARGE",
  propertyId?: number,
) {
  const [search, setSearchState] = useState("");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<BusinessPropertyOption[]>(initialItems);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled) { requestId.current += 1; setLoading(false); return; }
    const currentRequestId = ++requestId.current;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void fetchPropertyList({ page, size: 25, sort: "name,asc", search, propertyId, managementMode, unitLeaseMode })
        .then(response => {
          if (requestId.current !== currentRequestId) return;
          const incoming = ((response.data?.data ?? []) as BusinessPropertyOption[])
            .filter(item => !managementMode || !item.managementMode || item.managementMode === managementMode);
          setItems(existing => page === 0 ? incoming : mergeById(existing, incoming, item => item.id));
          setTotalPages(response.data?.totalPages ?? 0);
          setError(null);
        })
        .catch(reason => { if (requestId.current === currentRequestId) setError(reason); })
        .finally(() => { if (requestId.current === currentRequestId) setLoading(false); });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [enabled, managementMode, page, propertyId, search, unitLeaseMode]);

  const setSearch = (value: string) => { setLoading(enabled); setSearchState(value); setPage(0); setItems([]); };
  return { items, search, setSearch, loading, error, hasMore: page + 1 < totalPages, loadMore: () => setPage(value => value + 1) };
}

export function usePagedBusinessUnits(
  enabled: boolean,
  propertyId: number | null,
  leaseMode: "RENT" | "SALE" | "SERVICE_CHARGE",
  allowAllProperties = false,
  unitId?: number,
) {
  const [search, setSearchState] = useState("");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<BusinessUnitOption[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const canLoad = Boolean(enabled && (propertyId || allowAllProperties));
  const [loading, setLoading] = useState(canLoad);
  const [error, setError] = useState<unknown>(null);
  const requestId = useRef(0);

  useEffect(() => { setPage(0); setItems([]); setSearchState(""); }, [propertyId]);
  useEffect(() => {
    if (!canLoad) { requestId.current += 1; setLoading(false); return; }
    const currentRequestId = ++requestId.current;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void fetchUnitList({ page, size: 25, sort: "ref,asc", search, propertyId: propertyId ?? undefined, unitId, leaseMode })
        .then(response => {
          if (requestId.current !== currentRequestId) return;
          const incoming = ((response.data?.data ?? []) as BusinessUnitOption[])
            .filter(item => !item.leaseMode || item.leaseMode === leaseMode);
          setItems(existing => page === 0 ? incoming : mergeById(existing, incoming, item => item.unitId));
          setTotalPages(response.data?.totalPages ?? 0);
          setError(null);
        })
        .catch(reason => { if (requestId.current === currentRequestId) setError(reason); })
        .finally(() => { if (requestId.current === currentRequestId) setLoading(false); });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [canLoad, leaseMode, page, propertyId, search, unitId]);

  const setSearch = (value: string) => { setLoading(canLoad); setSearchState(value); setPage(0); setItems([]); };
  return { items, search, setSearch, loading, error, hasMore: page + 1 < totalPages, loadMore: () => setPage(value => value + 1) };
}
