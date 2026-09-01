"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const setSelectedBusinessAreaId = useAuthStore(state => state.setSelectedBusinessAreaId);
  const setStep = useAuthStore(state => state.setStep);
  const resetRegistrationData = useAuthStore(state => state.resetRegistrationData);
  const [publicRoles, setPublicRoles] = useState<PublicRole[]>([]);
  const [loading, setLoading] = useState(registrationMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addingArea, setAddingArea] = useState<string | null>(null);
  const isSuperadmin = roles.some(role => normalizedRoleTitle(role.title) === "superadmin");

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await listRoles();
      setPublicRoles((response.data.data ?? []).filter((role: PublicRole) => role.selfAssignable));
    } catch {
      setPublicRoles([]);
      setLoadError("We could not load the available business areas. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (registrationMode) resetRegistrationData();
  }, [registrationMode, resetRegistrationData]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await listRoles();
        if (!cancelled) setPublicRoles((response.data.data ?? []).filter((role: PublicRole) => role.selfAssignable));
      } catch {
        if (!cancelled) {
          setPublicRoles([]);
          setLoadError("We could not load the available business areas. Check your connection and try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const roleIdByName = useMemo(() => new Map(publicRoles.map(role => [normalizedRoleTitle(role.roleName), role.roleId])), [publicRoles]);

  const chooseArea = async (area: (typeof businessAreas)[number]) => {
    const roleId = roleIdByName.get(normalizedRoleTitle(area.registrationRoleName));
    if (!roleId) return void toast.error("This business area is not available for self-service yet.");
    if (registrationMode) {
      setRole(roleId);
      setSelectedBusinessAreaId(area.id);
      setStep("account");
      router.push("/register");
      return;
    }
    // Persist the intended product before any API call. If KYC or a transient
    // refresh interrupts this journey, Continue Setup can resume the exact
    // business area instead of falling back to the user's previous role.
    setSelectedBusinessAreaId(area.id);
    if (isSuperadmin) return void router.push(area.workspaceHref);
    const matchingRole = roles.find(role => area.roleTitles.includes(normalizedRoleTitle(role.title)));
    if (matchingRole) {
      setActiveRole(matchingRole);
      // An existing role can represent a safely resumed, partially-completed
      // Add Business Area attempt. Re-evaluate KYC and subscription state.
      router.push("/continue-setup");
      return;
    }
    if (!token) return void router.replace("/login");

    setAddingArea(area.id);
    try {
      const response = await selfAssignRole(roleId, token);
      const kycRequired = Boolean(response.data.data?.[0]?.kycRequired);
      await handleTokenRefresh();
      const refreshedRole = useAuthStore.getState().roles.find(role => area.roleTitles.includes(normalizedRoleTitle(role.title)));
      if (!refreshedRole) throw new Error("The new business area was assigned but the secure session could not be refreshed.");
      useAuthStore.getState().setActiveRole(refreshedRole);
      if (kycRequired) {
        toast.info("This business area needs additional verification. Let’s complete it securely.");
        router.push("/kyc");
      } else {
        toast.success(`${area.title} was added to your account.`);
        router.push(`/business-areas/plans?area=${area.id}`);
      }
    } catch (error: unknown) {
      toast.error(axios.isAxiosError(error) ? error.response?.data?.description ?? "Could not add this business area." : "Could not add this business area.");
    } finally {
      setAddingArea(null);
    }
  };

  if (loading) return <div className={`flex items-center justify-center ${registrationMode ? "min-h-64" : "min-h-screen bg-[#f3f4f6]"}`} role="status" aria-label="Loading business areas"><Loader2 className="h-9 w-9 animate-spin text-[#ff4b1f]" /></div>;

  const Wrapper = registrationMode ? "section" : "main";
  return <Wrapper className={registrationMode ? "w-full text-[#071744]" : "min-h-screen bg-[#f3f4f6] px-4 py-8 text-[#071744] sm:px-6 sm:py-14"}><div className="mx-auto w-full max-w-7xl">
    <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff4b1f] sm:text-sm sm:tracking-[0.24em]">SlickHood ecosystem</p><h1 className="mt-2 text-2xl font-bold leading-tight sm:mt-3 sm:text-4xl lg:text-5xl">Choose your business area</h1><p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-slate-500 sm:mt-4 sm:text-base">{registrationMode ? "Tell us what you want to do. SlickHood will configure the right role, verification requirements and workspace behind the scenes." : "Open an existing business area or add another one. Change Role remains your quick switch between active workspaces."}</p></div>
    {loadError && <div role="alert" className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-center text-sm text-amber-900 sm:flex-row sm:justify-between sm:text-left"><span>{loadError}</span><button type="button" onClick={() => void loadRoles()} className="min-h-11 shrink-0 rounded-xl bg-[#071744] px-5 py-2 font-bold text-white">Try again</button></div>}
    <div className="mt-7 grid grid-cols-1 gap-4 sm:mt-9 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">{businessAreas.map(area => {
      const Icon = icons[area.id];
      const ownedRole = roles.find(role => area.roleTitles.includes(normalizedRoleTitle(role.title)));
      const available = roleIdByName.has(normalizedRoleTitle(area.registrationRoleName));
      const busy = addingArea === area.id;
      return <article key={area.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-300 hover:shadow-lg sm:rounded-[24px] sm:p-5 lg:p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff4b1f] text-white sm:h-12 sm:w-12 sm:rounded-2xl"><Icon className="h-6 w-6" /></div><p className="mt-4 break-words text-[11px] font-bold uppercase tracking-[0.14em] text-[#ff4b1f] sm:mt-5 sm:text-xs">{area.eyebrow}</p><h2 className="mt-1.5 break-words text-xl font-bold leading-tight sm:text-2xl">{area.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{area.description}</p>
        <ul className="mt-4 space-y-2 text-sm text-slate-600 sm:mt-5">{area.highlights.map(item => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span className="min-w-0 break-words">{item}</span></li>)}</ul>
        <button type="button" disabled={!available || addingArea !== null || Boolean(loadError)} onClick={() => void chooseArea(area)} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#071744] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#ff4b1f] disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : !registrationMode && !ownedRole && !isSuperadmin ? <PlusCircle className="h-4 w-4" /> : null}{registrationMode ? "Choose this area" : isSuperadmin ? "Open area" : ownedRole ? "Open & view plans" : "Add business area"}{!busy && <ArrowRight className="h-4 w-4 shrink-0" />}</button>
      </article>;
    })}</div>
    {!registrationMode && <p className="mx-auto mt-8 max-w-3xl text-center text-sm text-slate-500">Adding an area never bypasses verification. If it introduces new KYC evidence, SlickHood securely pauses operational access until that evidence is reviewed.</p>}
  </div></Wrapper>;
}
