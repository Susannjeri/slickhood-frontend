"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { businessAreas, normalizedRoleTitle } from "@/config/businessAreas";
import {
  CurrentSubscription,
  getCurrentSubscription,
  getSubscriptionCatalog,
  getSubscriptionTrialPolicy,
  requestSubscriptionSalesContact,
  startSubscriptionTrial,
  subscriptionRoleForTitle,
} from "@/services/subscription.service";
import { useAuthStore } from "@/store/authStore";
import { SubscriptionPlan } from "@/types/subscription";

type BillingChoice = "MONTHLY" | "YEARLY";
type TierName = "Bronze" | "Silver" | "Gold" | "Platinum";

const TIER_ORDER: TierName[] = ["Bronze", "Silver", "Gold", "Platinum"];
const TIER_COPY: Record<TierName, { audience: string; featured?: boolean }> = {
  Bronze: { audience: "Individual and small landlords" },
  Silver: { audience: "Growing landlords" },
  Gold: { audience: "Large landlords and SMEs", featured: true },
  Platinum: { audience: "Property managers and agencies" },
};

const tierName = (plan: SubscriptionPlan): TierName | null => {
  const match = TIER_ORDER.find(tier => `${plan.code} ${plan.displayName}`.toLowerCase().includes(tier.toLowerCase()));
  return match ?? null;
};

const friendlyFeature = (value: string) => value
  .replaceAll("_", " ")
  .toLowerCase()
  .replace(/\b\w/g, letter => letter.toUpperCase());

export default function BusinessAreaPlans() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthStore(state => state.token);
  const activeRole = useAuthStore(state => state.activeRole);
  const roles = useAuthStore(state => state.roles);
  const setActiveRole = useAuthStore(state => state.setActiveRole);
  const area = businessAreas.find(item => item.id === searchParams.get("area"));
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billing, setBilling] = useState<BillingChoice>("MONTHLY");
  const [trialDays, setTrialDays] = useState(14);
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingCode, setStartingCode] = useState<string | null>(null);
  const [expandedTier, setExpandedTier] = useState<TierName | null>(null);
  const [salesPlan, setSalesPlan] = useState<SubscriptionPlan | null>(null);
  const [salesMessage, setSalesMessage] = useState("");
  const [salesSubmitted, setSalesSubmitted] = useState(false);

  const eligibleRoles = useMemo(() => area
    ? roles.filter(role => area.roleTitles.includes(normalizedRoleTitle(role.title)))
    : [], [area, roles]);
  const selectedRole = eligibleRoles.find(role => role.title === activeRole?.title) ?? eligibleRoles[0];
  const subscriptionRole = subscriptionRoleForTitle(selectedRole?.title);
  const propertyPackageArea = !["service-marketplace", "soko", "affiliate"].includes(area?.id ?? "");

  const load = useCallback(async () => {
    if (!token || !area || !selectedRole || !subscriptionRole) {
      setLoading(false);
      return;
    }
    if (activeRole?.title !== selectedRole.title) setActiveRole(selectedRole);
    setLoading(true);
    try {
      const [catalogResponse, policyResponse, currentResponse] = await Promise.all([
        getSubscriptionCatalog(token, subscriptionRole, area.subscriptionProduct),
        getSubscriptionTrialPolicy(token),
        getCurrentSubscription(token, subscriptionRole, area.subscriptionProduct),
      ]);
      setPlans((catalogResponse.data.data ?? []).filter((plan: SubscriptionPlan) =>
        plan.active && plan.productKey === area.subscriptionProduct));
      setTrialDays(policyResponse.data.data?.[0]?.durationDays ?? 14);
      setCurrent(currentResponse.data.data?.[0] ?? null);
    } catch {
      toast.error("Could not load this business area's subscription plans.");
    } finally {
      setLoading(false);
    }
  }, [token, area, selectedRole, subscriptionRole, activeRole?.title, setActiveRole]);

  useEffect(() => { void load(); }, [load]);

  const packages = useMemo(() => propertyPackageArea ? TIER_ORDER.map(tier => ({
    tier,
    plan: plans.find(plan => tierName(plan) === tier && plan.billingCycle === billing),
  })).filter((entry): entry is { tier: TierName; plan: SubscriptionPlan } => Boolean(entry.plan)) : [], [plans, billing, propertyPackageArea]);

  if (!area) return <main className="flex min-h-screen items-center justify-center bg-slate-50"><button onClick={() => router.replace("/business-areas")} className="rounded-xl bg-[#071744] px-6 py-3 font-bold text-white">Choose a business area</button></main>;
  if (loading) return <main className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-9 w-9 animate-spin text-[#ff4b1f]" /></main>;
  if (!selectedRole || !subscriptionRole) return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5"><div className="max-w-lg rounded-3xl bg-white p-10 text-center"><h1 className="text-2xl font-bold text-[#071744]">Role required</h1><p className="mt-3 text-slate-500">This business area is not attached to one of your roles.</p><button onClick={() => router.replace("/business-areas")} className="mt-6 rounded-xl bg-[#071744] px-6 py-3 font-bold text-white">Back</button></div></main>;

  const workspaceHref = area.workspaceHref;
  if (current) return <main className="min-h-screen bg-slate-50 px-5 py-16"><div className="mx-auto max-w-2xl rounded-[32px] border border-emerald-200 bg-white p-10 text-center shadow-xl"><ShieldCheck className="mx-auto h-16 w-16 text-emerald-500" /><p className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Subscription active for {selectedRole.title}</p><h1 className="mt-2 text-4xl font-bold text-[#071744]">{current.planDetails.displayName}</h1><p className="mt-3 text-slate-500">This role has its own subscription. Changing role will load that role&apos;s separate plan.</p><p className="mt-5 rounded-2xl bg-orange-50 p-4 font-semibold text-[#ff4b1f]">Current term ends {current.endAt ? new Date(current.endAt).toLocaleDateString("en-KE", { dateStyle: "long" }) : "without expiry"}</p><button onClick={() => router.push(workspaceHref)} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#ff4b1f] px-7 py-3 font-bold text-white">Enter {area.title}<ArrowRight className="h-4 w-4" /></button></div></main>;

  return (
    <main className="min-h-screen bg-[#f4f5f7] px-5 py-10 text-[#071744] sm:py-14">
      <div className="mx-auto max-w-7xl">
        <button onClick={() => router.push("/business-areas")} className="flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="h-4 w-4" /> Business areas</button>
        <div className="mt-7 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#ff4b1f]">{area.eyebrow}</p>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{propertyPackageArea ? `Choose your ${area.title} package` : `${area.title} merchant access`}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-500">{propertyPackageArea ? `Registration is complete. Start with a ${trialDays}-day free trial. No payment is charged today, and the package stays attached to your ${selectedRole.title} role.` : `Services and Soko use their own merchant package model. It is separate from the property unit tiers and remains attached to your ${selectedRole.title} role.`}</p>
          {propertyPackageArea && <div className="mx-auto mt-7 inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            {(["MONTHLY", "YEARLY"] as BillingChoice[]).map(choice => <button key={choice} onClick={() => setBilling(choice)} className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${billing === choice ? "bg-[#071744] text-white" : "text-slate-500 hover:text-[#071744]"}`}>{choice === "MONTHLY" ? "Monthly" : "Annual · Save 10%"}</button>)}
          </div>}
        </div>

        {!propertyPackageArea ? <div className="mx-auto mt-10 grid max-w-3xl gap-5 md:grid-cols-2">
          {plans.map(plan => {
            const enabledFeatures = plan.features?.filter(feature => feature.enabled) ?? [];
            return <article key={plan.uuid} className="flex rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex w-full flex-col">
                <span className="w-fit rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#ff4b1f]">{subscriptionRole === "AFFILIATE" ? "Affiliate" : "Services & Soko"}</span>
                <h2 className="mt-5 text-3xl font-bold">{plan.displayName}</h2>
                <p className="mt-2 text-sm text-slate-500">Operate service listings or Soko merchant workflows under the dedicated Slick Market catalogue.</p>
                <p className="mt-6 text-2xl font-bold">{Number(plan.price) === 0 ? "No recurring fee" : `${plan.currency} ${Number(plan.price).toLocaleString("en-KE")}`}</p>
                {enabledFeatures.length > 0 && <ul className="mt-6 space-y-3 text-sm text-slate-600">{enabledFeatures.map(feature => <li key={feature.featureKey} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{friendlyFeature(feature.featureKey)}</li>)}</ul>}
                <button disabled={startingCode !== null} onClick={async () => {
                  setStartingCode(plan.code);
                  try {
                    const response = await startSubscriptionTrial(token!, subscriptionRole, plan.code);
                    setCurrent(response.data.data?.[0] ?? null);
                    toast.success("Slick Market access activated.");
                  } catch (error: unknown) {
                    toast.error(axios.isAxiosError(error) ? error.response?.data?.description ?? "Could not activate this package." : "Could not activate this package.");
                  } finally { setStartingCode(null); }
                }} className="mt-7 flex items-center justify-center gap-2 rounded-xl bg-[#071744] px-5 py-3 font-bold text-white hover:bg-[#ff4b1f] disabled:opacity-50">{startingCode === plan.code ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue with this package"}</button>
              </div>
            </article>;
          })}
          {plans.length === 0 && <div className="col-span-full rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center"><h2 className="text-xl font-bold">Merchant package is being configured</h2><p className="mt-2 text-sm text-slate-600">No active Slick Market package is available for this role.</p></div>}
        </div> : packages.length === 0 ? <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center"><h2 className="text-xl font-bold">Packages are being configured</h2><p className="mt-2 text-sm text-slate-600">No {billing.toLowerCase()} packages are currently available for this business area.</p></div> :
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {packages.map(({ tier, plan }) => {
            const custom = tier === "Platinum" || plan.features?.some(feature => feature.enabled && feature.featureKey === "CUSTOM_PRICING");
            const units = plan.quotas?.find(quota => ["UNITS", "MAX_UNITS"].includes(quota.metricKey))?.limitValue;
            const enabledFeatures = plan.features?.filter(feature => feature.enabled && !["CUSTOM_PRICING", "UNITS"].includes(feature.featureKey)) ?? [];
            const shownFeatures = expandedTier === tier ? enabledFeatures : enabledFeatures.slice(0, 7);
            return <article key={tier} className={`relative flex rounded-[28px] border bg-white p-6 shadow-sm ${TIER_COPY[tier].featured ? "border-[#ff4b1f] ring-4 ring-orange-100" : "border-slate-200"}`}>
              {TIER_COPY[tier].featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#ff4b1f] px-4 py-1 text-xs font-bold uppercase tracking-wide text-white">Most popular</span>}
              <div className="flex w-full flex-col">
                <h2 className="mt-2 text-2xl font-bold">{tier}</h2>
                <p className="mt-1 min-h-10 text-sm text-slate-500">{TIER_COPY[tier].audience}</p>
                <div className="mt-5 min-h-16">{custom ? <p className="text-2xl font-bold">Custom pricing</p> : <><span className="text-3xl font-bold">KES {Number(plan.price).toLocaleString("en-KE")}</span><span className="text-sm text-slate-400"> / {billing === "YEARLY" ? "year" : "month"}</span></>}</div>
                <p className="mt-2 text-sm font-semibold text-[#ff4b1f]">{units === -1 || tier === "Platinum" ? "100+ units" : units ? `Up to ${units} units` : `${trialDays}-day trial`}</p>
                {billing === "YEARLY" && !custom && <p className="mt-1 text-xs font-bold text-emerald-600">10% annual saving included</p>}
                <ul className="mt-6 space-y-3 text-sm text-slate-600">{shownFeatures.map(feature => <li key={feature.featureKey} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{friendlyFeature(feature.featureKey)}</li>)}</ul>
                {enabledFeatures.length > 7 && <button type="button" onClick={() => setExpandedTier(expandedTier === tier ? null : tier)} className="mt-4 flex items-center gap-1 text-left text-xs font-bold text-[#071744]">{expandedTier === tier ? "Show fewer features" : `View all ${enabledFeatures.length} features`}<ChevronDown className={`h-4 w-4 transition ${expandedTier === tier ? "rotate-180" : ""}`} /></button>}
                <button disabled={startingCode !== null} onClick={async () => {
                  if (custom) { setSalesPlan(plan); setSalesSubmitted(false); return; }
                  setStartingCode(plan.code);
                  try {
                    const response = await startSubscriptionTrial(token!, subscriptionRole, plan.code);
                    setCurrent(response.data.data?.[0] ?? null);
                    toast.success(`${trialDays}-day trial activated.`);
                  } catch (error: unknown) {
                    toast.error(axios.isAxiosError(error) ? error.response?.data?.description ?? "Could not start the trial." : "Could not start the trial.");
                  } finally { setStartingCode(null); }
                }} className="mt-7 flex items-center justify-center gap-2 rounded-xl bg-[#071744] px-5 py-3 font-bold text-white hover:bg-[#ff4b1f] disabled:opacity-50">{startingCode === plan.code ? <Loader2 className="h-4 w-4 animate-spin" /> : custom ? "Contact Sales" : <><Sparkles className="h-4 w-4" />Start Free Trial</>}</button>
              </div>
            </article>;
          })}
        </div>}
      </div>

      <Dialog open={!!salesPlan} onOpenChange={open => { if (!open) setSalesPlan(null); }}><DialogContent className="max-w-lg rounded-3xl">{salesSubmitted ? <div className="py-5 text-center"><Check className="mx-auto h-14 w-14 rounded-full bg-emerald-100 p-3 text-emerald-600" /><DialogTitle className="mt-5 text-2xl">Request submitted</DialogTitle><p className="mt-2 text-sm text-slate-500">Our team will contact you about custom Platinum pricing, capacity and trial terms.</p><button onClick={() => setSalesPlan(null)} className="mt-6 w-full rounded-xl bg-[#ff4b1f] py-3 font-bold text-white">Done</button></div> : <div className="space-y-5"><DialogTitle className="text-2xl">Contact Sales</DialogTitle><p className="text-sm text-slate-500">Platinum pricing and trial terms are tailored to 100+ units, agencies and integrations.</p><textarea value={salesMessage} onChange={event => setSalesMessage(event.target.value)} maxLength={1000} placeholder="Tell us about your properties, units or integration needs" className="min-h-28 w-full rounded-xl border border-slate-200 p-3" /><button onClick={async () => { if (!salesPlan) return; try { await requestSubscriptionSalesContact(token!, salesPlan.code, salesMessage); setSalesSubmitted(true); } catch { toast.error("Could not submit the request."); } }} className="w-full rounded-xl bg-[#ff4b1f] py-3 font-bold text-white">Submit Request</button></div>}</DialogContent></Dialog>
    </main>
  );
}
