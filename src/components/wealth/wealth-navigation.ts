"use client";

import { useCallback, useEffect, useState } from "react";

export const wealthTabs = ["overview", "assets", "finance", "compliance", "vault", "goals"] as const;
export type WealthTab = typeof wealthTabs[number];
export function wealthTab(value: string): WealthTab {
  return wealthTabs.includes(value as WealthTab) ? value as WealthTab : "overview";
}
export function insightTab(code: string): WealthTab {
  if (code.endsWith("COMPLIANCE")) return "compliance";
  if (["HIGH_LTV", "NEGATIVE_CASH_FLOW", "STALE_VALUATION", "RENT_ARREARS"].includes(code)) return "finance";
  return "assets";
}

export function useWealthNavigation() {
  const [tab, setTab] = useState<WealthTab>("overview");
  const scroll = useCallback(() => {
    requestAnimationFrame(() => document.getElementById("wealth-workspace")?.scrollIntoView({ block: "start", behavior: "instant" }));
  }, []);
  useEffect(() => {
    const sync = () => {
      const value = window.location.hash.replace(/^#wealth-/, "");
      setTab(wealthTab(value));
      if (window.location.hash.startsWith("#wealth-")) scroll();
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, [scroll]);
  const navigate = useCallback((value: string) => {
    const next = wealthTab(value);
    const hash = `#wealth-${next}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    setTab(next);
    window.dispatchEvent(new Event("hashchange"));
    scroll();
  }, [scroll]);
  return { tab, navigate };
}
