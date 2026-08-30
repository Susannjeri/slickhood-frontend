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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sessionReady) return;
    if (!token) { router.replace("/login"); return; }
    if (staffRoles.has(normalizedRoleTitle(role?.title)) || pathname === "/dashboard/helpdesk") { setReady(true); return; }
    let cancelled = false;
    getCurrentKyc().then(kyc => {
      if (cancelled) return;
      if (kyc.status !== "APPROVED" || kyc.accountStatus !== "ACTIVE") router.replace("/kyc");
      else setReady(true);
    }).catch(() => { if (!cancelled) router.replace("/kyc"); });
    return () => { cancelled = true; };
  }, [pathname, role?.title, router, sessionReady, token]);

  if (!ready) return <div className="flex min-h-[60vh] items-center justify-center text-slate-500"><Loader2 className="mr-3 h-6 w-6 animate-spin text-[#EF4217]" />Checking account verification…</div>;
  return children;
}
