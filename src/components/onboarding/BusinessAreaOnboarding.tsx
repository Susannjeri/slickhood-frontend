"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, ChartNoAxesCombined, Check, Loader2, PlusCircle, Store, Users } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { businessAreas, normalizedRoleTitle } from "@/config/businessAreas";
import { listRoles, selfAssignRole } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

type PublicRole = { roleId: number; roleName: string; selfAssignable: boolean };

const icons = {
  "property-management": Building2,
  "property-sales": ChartNoAxesCombined,
  "estate-management": Building2,
  "service-marketplace": Users,
  soko: Store,
  affiliate: Users,
  "asset-portfolio": ChartNoAxesCombined,
};

export default function BusinessAreaOnboarding({ registrationMode = false }: { registrationMode?: boolean }) {
  const router = useRouter();
  const { handleTokenRefresh } = useAuth();
  const token = useAuthStore(state => state.token);
  const roles = useAuthStore(state => state.roles);
  const setActiveRole = useAuthStore(state => state.setActiveRole);
  const setRole = useAuthStore(state => state.setRole);
  const setStep = useAuthStore(state => state.setStep);
  const resetRegistrationData = useAuthStore(state => state.resetRegistrationData);
  const [publicRoles, setPublicRoles] = useState<PublicRole[]>([]);
  const [loading, setLoading] = useState(registrationMode);
  const [addingArea, setAddingArea] = useState<string | null>(null);
  const isSuperadmin = roles.some(role => normalizedRoleTitle(role.title) === "superadmin");

  useEffect(() => {
    if (registrationMode) resetRegistrationData();
    let cancelled = false;
    const load = async () => {
      try {
        const response = await listRoles();
        if (!cancelled) setPublicRoles((response.data.data ?? []).filter((role: PublicRole) => role.selfAssignable));
      } catch {
        if (!cancelled) toast.error("Business areas could not be loaded. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [registrationMode, resetRegistrationData]);

  const roleIdByName = useMemo(() => new Map(publicRoles.map(role => [normalizedRoleTitle(role.roleName), role.roleId])), [publicRoles]);

  const chooseArea = async (area: (typeof businessAreas)[number]) => {
    const roleId = roleIdByName.get(normalizedRoleTitle(area.registrationRoleName));
    if (!roleId) return void toast.error("This business area is not available for self-service yet.");
    if (registrationMode) {
      setRole(roleId);
      setStep("account");
      router.push("/register");
      return;
    }
    if (isSuperadmin) return void router.push(area.workspaceHref);
    const matchingRole = roles.find(role => area.roleTitles.includes(normalizedRoleTitle(role.title)));
    if (matchingRole) {
      setActiveRole(matchingRole);
      router.push(`/business-areas/plans?area=${area.id}`);
      return;
    }
    if (!token) return void router.replace("/login");

    setAddingArea(area.id);
    try {
      const response = await selfAssignRole(roleId, token);
      const kycRequired = Boolean(response.data.data?.[0]?.kycRequired);
      await handleTokenRefresh();
      if (kycRequired) {
        toast.info("This business area needs additional verification. Let’s complete it securely.");
        router.push("/kyc");
      } else {
        const refreshedRole = useAuthStore.getState().roles.find(role => area.roleTitles.includes(normalizedRoleTitle(role.title)));
        if (refreshedRole) useAuthStore.getState().setActiveRole(refreshedRole);
        toast.success(`${area.title} was added to your account.`);
        router.push(`/business-areas/plans?area=${area.id}`);
      }
    } catch (error: unknown) {
      toast.error(axios.isAxiosError(error) ? error.response?.data?.description ?? "Could not add this business area." : "Could not add this business area.");
    } finally {
      setAddingArea(null);
    }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f3f4f6]"><Loader2 className="h-9 w-9 animate-spin text-[#ff4b1f]" /></main>;

  return <main className="min-h-screen bg-[#f3f4f6] px-5 py-10 text-[#071744] sm:py-14"><div className="mx-auto max-w-7xl">
    <div className="text-center"><p className="text-sm font-bold uppercase tracking-[0.24em] text-[#ff4b1f]">SlickHood ecosystem</p><h1 className="mt-3 text-4xl font-bold sm:text-5xl">Choose your business area</h1><p className="mx-auto mt-4 max-w-3xl text-slate-500">{registrationMode ? "Tell us what you want to do. SlickHood will configure the right role, verification requirements and workspace behind the scenes." : "Open an existing business area or add another one. Change Role remains your quick switch between active workspaces."}</p></div>
    <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{businessAreas.map(area => {
      const Icon = icons[area.id];
      const ownedRole = roles.find(role => area.roleTitles.includes(normalizedRoleTitle(role.title)));
      const available = roleIdByName.has(normalizedRoleTitle(area.registrationRoleName));
      const busy = addingArea === area.id;
      return <article key={area.id} className="flex min-h-[420px] flex-col rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff4b1f] text-white"><Icon className="h-7 w-7" /></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#ff4b1f]">{area.eyebrow}</p><h2 className="mt-2 text-2xl font-bold">{area.title}</h2><p className="mt-3 text-sm leading-6 text-slate-500">{area.description}</p>
        <ul className="mt-6 space-y-3 text-sm text-slate-600">{area.highlights.map(item => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{item}</li>)}</ul>
        <button disabled={!available || addingArea !== null} onClick={() => void chooseArea(area)} className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-[#071744] px-5 py-3 font-bold text-white hover:bg-[#ff4b1f] disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : !registrationMode && !ownedRole && !isSuperadmin ? <PlusCircle className="h-4 w-4" /> : null}{registrationMode ? "Choose this area" : isSuperadmin ? "Open area" : ownedRole ? "Open & view plans" : "Add business area"}{!busy && <ArrowRight className="h-4 w-4" />}</button>
      </article>;
    })}</div>
    {!registrationMode && <p className="mx-auto mt-8 max-w-3xl text-center text-sm text-slate-500">Adding an area never bypasses verification. If it introduces new KYC evidence, SlickHood securely pauses operational access until that evidence is reviewed.</p>}
  </div></main>;
}
