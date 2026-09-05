"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Loader2 } from "lucide-react";

interface RequireRoleProps {
  roles: string[];
  // Optional — when provided, the active role must ALSO hold at least one
  // of these permissions (matches Can's semantics: empty/omitted = no
  // permission requirement).
  permissions?: string[];
  children: ReactNode;
  redirectTo?: string;
}

// Page-level role (+ optional permission) lock (distinct from Can/CanProperty,
// which hide pieces of UI within an already-reachable page). Reads activeRole
// reactively — a role switch while the page is mounted re-evaluates on the
// next render and redirects immediately, it isn't just a mount-time check.
export default function RequireRole({ roles, permissions = [], children, redirectTo = "/dashboard" }: RequireRoleProps) {
  const activeRole = useAuthStore((s) => s.activeRole);
  const router = useRouter();
  const pathname = usePathname();
  const hasRole = !!activeRole && roles.includes(activeRole.title);
  const hasPermission =
    permissions.length === 0 || permissions.some((p) => activeRole?.permissions.includes(p));
  const allowed = hasRole && hasPermission;

  useEffect(() => {
    if (allowed || pathname === redirectTo) return;
    router.replace(redirectTo);
    // A page-level role guard must fail closed even if a client transition is
    // interrupted while layouts are hydrating. The hard-navigation fallback
    // also clears the forbidden route from the address bar.
    const fallback = window.setTimeout(() => {
      if (window.location.pathname !== redirectTo) window.location.replace(redirectTo);
    }, 750);
    return () => window.clearTimeout(fallback);
  }, [allowed, pathname, redirectTo, router]);

  if (!allowed) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return <>{children}</>;
}
