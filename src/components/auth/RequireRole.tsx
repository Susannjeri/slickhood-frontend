"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const hasRole = !!activeRole && roles.includes(activeRole.title);
  const hasPermission =
    permissions.length === 0 || permissions.some((p) => activeRole?.permissions.includes(p));
  const allowed = hasRole && hasPermission;

  useEffect(() => {
    if (!allowed) router.replace(redirectTo);
  }, [allowed, redirectTo, router]);

  if (!allowed) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return <>{children}</>;
}
