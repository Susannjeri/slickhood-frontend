"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getCurrentKyc } from "@/services/kyc.service";
import { useAuthStore } from "@/store/authStore";
import { normalizedRoleTitle } from "@/config/businessAreas";

const staffRoles = new Set(["superadmin", "support", "salesmarketing", "finance", "insuranceadviser", "insurancemanager", "guard", "propertymanager"]);

export default function OperationalAccessGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sessionReady = useAuthStore(state => state.sessionReady);
  const token = useAuthStore(state => state.token);
  const role = useAuthStore(state => state.activeRole);
  const [verifiedScope, setVerifiedScope] = useState<string | null>(null);
  const roleTitle = role?.title ?? "";
  const accessScope = token && roleTitle ? `${token}:${roleTitle}` : null;
  const bypassKyc = staffRoles.has(normalizedRoleTitle(roleTitle)) || pathname === "/dashboard/helpdesk";

  useEffect(() => {
    if (!sessionReady) return;
    if (!token) { router.replace("/login"); return; }
    if (bypassKyc) return;
    if (!accessScope || verifiedScope === accessScope) return;
    let cancelled = false;
    getCurrentKyc().then(kyc => {
      if (cancelled) return;
      // Additional-role KYC is role-scoped. The backend withholds that pending
      // role from the JWT, while an already-approved account remains usable.
      if (kyc.accountStatus !== "ACTIVE") router.replace("/kyc");
      else setVerifiedScope(accessScope);
    }).catch(() => { if (!cancelled) router.replace("/kyc"); });
    return () => { cancelled = true; };
  }, [accessScope, bypassKyc, router, sessionReady, token, verifiedScope]);

  if (!sessionReady || !token || (!bypassKyc && verifiedScope !== accessScope)) {
    return <div className="flex min-h-[60vh] items-center justify-center text-slate-500"><Loader2 className="mr-3 h-6 w-6 animate-spin text-[#EF4217]" />Checking account verification…</div>;
  }
  return children;
}
