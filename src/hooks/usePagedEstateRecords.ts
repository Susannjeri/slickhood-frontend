"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API } from "@/lib/api";

/** Independent, bounded lists: one failed feed must not hide successful estate records. */
export function usePagedEstateRecords<T extends { id?: number; budget?: { id: number } }>(
  path: string, enabled: boolean, propertyId?: number, active?: boolean,
) {
  const scope = `${path}:${enabled}:${propertyId ?? "all"}:${active ?? "all"}`;
  const sequence = useRef(0);
  const [data, setData] = useState<{ scope: string; items: T[]; page: number; pages: number; total: number }>({ scope: "", items: [], page: -1, pages: 0, total: 0 });
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);
  const fetchPage = useCallback(async (page: number) => {
    const request = ++sequence.current;
    if (!enabled) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const response = await API.get(path, { params: { page, size: 25, sort: "id,desc", propertyId, active } });
      if (request !== sequence.current) return;
      const incoming = (response.data?.data ?? []) as T[];
      if (!Array.isArray(incoming) || incoming.some(item => !Number.isSafeInteger(item?.id ?? item?.budget?.id))) {
        throw new Error("The estate records could not be read. Please retry.");
      }
      setData(previous => {
        const rows = page > 0 && previous.scope === scope ? [...previous.items, ...incoming] : incoming;
        return { scope, items: Array.from(new Map(rows.map(item => [item.id ?? item.budget?.id, item])).values()), page,
          pages: response.data?.totalPages ?? 1, total: response.data?.totalElements ?? rows.length };
      });
    } catch (reason) {
      if (request === sequence.current) setError(reason);
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [active, enabled, path, propertyId, scope]);
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => { if (!cancelled) void fetchPage(0); });
    return () => { cancelled = true; sequence.current += 1; };
  }, [fetchPage]);
  const current = enabled && data.scope === scope;
  return { items: current ? data.items : [], total: current ? data.total : 0,
    loading, error, hasMore: current && data.page + 1 < data.pages,
    reload: () => fetchPage(0), loadMore: () => fetchPage(current ? data.page + 1 : 0) };
}
