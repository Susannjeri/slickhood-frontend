import { useEffect, useState } from "react";

// Separate from shadcn's useIsMobile (768px) so we don't affect
// the sidebar or other components that depend on it.
// Matches Tailwind's lg breakpoint — 1024px.
const MOBILE_BREAKPOINT = 1024;

export function useIsInvoiceMobile() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  // null  = not yet determined — used to gate rendering in InvoicesPage
  // false = confirmed desktop
  // true  = confirmed mobile

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT); // resolve immediately on mount
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile; // caller receives null | true | false — do NOT wrap in !!
}