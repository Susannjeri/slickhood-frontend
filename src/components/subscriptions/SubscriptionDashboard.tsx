"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarClock, Check, Download, Loader2, ReceiptText, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import {
  cancelSubscription,
  getSubscriptionBillingHistory,
  getSubscriptionOverview,
  restoreSubscriptionCancellation,
  revokeSubscriptionPlanChange,
  SubscriptionBillingItem,
  SubscriptionOverview,
  subscriptionRoleForTitle,
  updateSubscriptionAutoRenew,
} from "@/services/subscription.service";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import SubscriptionCheckoutModal from "./SubscriptionCheckoutModal";
import { businessAreas } from "@/config/businessAreas";

type View = "overview" | "billing";

function quota(overview: SubscriptionOverview, key: string) {
  return overview.subscription?.planDetails.quotas?.find(item => item.metricKey === key)?.limitValue ?? 0;
}

function formatDate(value?: string | null) {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value));
}

function UsageCard({ label, used, limit, color }: { label: string; used: number; limit: number; color: string }) {
  const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-7">
      <p className="font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-4xl font-bold text-[#08184a]">{used} / {limit || "∞"}</p>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
      {limit > 0 && percentage >= 80 && <p className="mt-3 text-xs font-semibold text-amber-600">You are nearing this plan limit.</p>}
    </div>
  );
}

export default function SubscriptionDashboard() {
  const token = useAuthStore(state => state.token);
  const activeRole = useAuthStore(state => state.activeRole);
  const selectedBusinessAreaId = useAuthStore(state => state.selectedBusinessAreaId);
  const subscriptionRole = subscriptionRoleForTitle(activeRole?.title);
  const selectedProduct = businessAreas.find(area => area.id === selectedBusinessAreaId)?.subscriptionProduct;
  const router = useRouter();
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null);
  const [billing, setBilling] = useState<SubscriptionBillingItem[]>([]);
  const [view, setView] = useState<View>("overview");
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [renewOpen, setRenewOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token || !subscriptionRole) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [overviewResponse, billingResponse] = await Promise.all([
        getSubscriptionOverview(token, subscriptionRole, selectedProduct),
        getSubscriptionBillingHistory(token),
      ]);
      setOverview(overviewResponse.data.data?.[0] ?? null);
      setBilling(billingResponse.data.data ?? []);
    } catch {
      toast.error("Could not load subscription details.");
    } finally {
      setLoading(false);
    }
  }, [token, subscriptionRole, selectedProduct]);

  useEffect(() => { void load(); }, [load]);

  const totalSpend = useMemo(() => billing
    .filter(item => item.status === "SUCCESSFUL")
    .reduce((sum, item) => sum + item.amount, 0), [billing]);

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#ff4b1f]" /></div>;
  }

  if (!subscriptionRole) {
    return <div className="mx-auto mt-12 max-w-2xl rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm"><ShieldCheck className="mx-auto h-14 w-14 text-emerald-500" /><h1 className="mt-5 text-3xl font-bold text-[#08184a]">No subscription required</h1><p className="mt-2 text-slate-500">Your {activeRole?.title ?? "operational"} role is provided through an assigned workspace. Change role to manage a business-area subscription.</p><button onClick={() => router.push("/dashboard")} className="mt-7 rounded-xl bg-[#08184a] px-8 py-3 font-bold text-white">Continue to Workspace</button></div>;
  }

  if (!overview?.subscription) {
    return (
      <div className="mx-auto mt-12 max-w-2xl rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <ReceiptText className="mx-auto h-14 w-14 text-[#ff4b1f]" />
        <h1 className="mt-5 text-3xl font-bold text-[#08184a]">Choose Your Subscription Plan</h1>
        <p className="mt-2 text-slate-500">Select a plan to unlock the SlickHood tools for your business area.</p>
        <button onClick={() => router.push("/dashboard/upgrade-plan")} className="mt-7 rounded-xl bg-[#ff4b1f] px-8 py-3 font-bold text-white">View Plans</button>
      </div>
    );
  }

  const subscription = overview.subscription;
  const product = subscription.productKey ?? selectedProduct;
  const plan = subscription.planDetails;
  const status = subscription.status;
  const needsRenewal = status === "EXPIRED" || status === "SUSPENDED" || status === "CANCELLED";
  const propertiesLimit = quota(overview, "MAX_PROPERTIES");
  const unitsLimit = quota(overview, "UNITS") || quota(overview, "MAX_UNITS");

  const mutate = async (action: () => Promise<unknown>, success: string) => {
    setMutating(true);
    try {
      await action();
      toast.success(success);
      await load();
    } catch {
      toast.error("The subscription update could not be completed.");
    } finally {
      setMutating(false);
    }
  };

  const downloadStatement = () => {
    const rows = ["Invoice,Date,Plan,Currency,Amount,Status", ...billing.map(item =>
      [item.invoiceRef, item.createdOn, item.planCode, item.currency, item.amount, item.status].join(","))];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "slickhood-subscription-statement.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (view === "billing") {
    return (
      <div className="space-y-7 p-5">
        <button onClick={() => setView("overview")} className="flex items-center gap-2 font-semibold text-slate-500"><ArrowLeft className="h-4 w-4" /> Subscription</button>
        <div>
          <h1 className="text-4xl font-bold text-[#08184a]">Billing History</h1>
          <p className="mt-2 text-slate-400">Track all subscription payments and transactions.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl bg-[#08184a] p-7 text-white"><p className="text-white/70">Total subscription spend</p><p className="mt-3 text-4xl font-bold">{plan.currency} {totalSpend.toLocaleString()}</p></div>
          <button onClick={downloadStatement} className="flex items-center justify-center gap-3 rounded-3xl border-2 border-[#ff4b1f] bg-white p-7 font-bold text-[#ff4b1f]"><Download className="h-6 w-6" /> Download Statement</button>
        </div>
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          {billing.length === 0 ? <p className="p-10 text-center text-slate-400">No subscription transactions yet.</p> : billing.map(item => (
            <div key={item.invoiceRef} className="flex flex-col gap-3 border-b border-slate-100 p-6 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-bold text-[#08184a]">{item.planCode} subscription</p><p className="text-sm text-slate-400">{formatDate(item.createdOn)} • {item.invoiceRef}</p></div>
              <div className="sm:text-right"><p className="font-bold text-[#08184a]">{item.currency} {item.amount.toLocaleString()}</p><span className={`text-xs font-bold ${item.status === "SUCCESSFUL" ? "text-emerald-600" : item.status === "PROCESSING" ? "text-amber-600" : "text-slate-500"}`}>{item.status}</span></div>
            </div>
          ))}
        </div>
        <p className="flex items-center justify-center gap-2 text-sm text-slate-400"><ShieldCheck className="h-4 w-4" /> All transactions are securely verified by SlickHood Payments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-5">
      <div><h1 className="text-4xl font-bold text-[#08184a]">Subscription</h1><p className="mt-2 text-slate-400">Manage your active plan and billing.</p></div>

      {status !== "ACTIVE" && (
        <div className={`rounded-3xl p-6 ${status === "SUSPENDED" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>
          <div className="flex gap-4"><AlertTriangle className="mt-1 h-7 w-7 shrink-0" /><div><h2 className="text-xl font-bold">Subscription {status.toLowerCase()}</h2><p className="mt-1">Renew to restore premium access and continue operations. Your existing data remains secure.</p></div></div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-[28px] bg-[#ff4b1f] p-8 text-white sm:p-10">
        <div className="absolute -right-8 -top-12 h-48 w-48 rounded-full bg-white/15" />
        <span className="relative rounded-full bg-white px-6 py-2 text-sm font-bold text-[#ff4b1f]">{status}</span>
        <p className="relative mt-7 text-lg font-bold text-orange-100">Current Plan</p>
        <h2 className="relative text-5xl font-bold">{plan.displayName}</h2>
        <p className="relative mt-3 text-2xl text-orange-100">{plan.currency} {Number(plan.price).toLocaleString()} / {plan.billingCycle.toLowerCase()}</p>
        <p className="relative mt-6 text-orange-100">{needsRenewal ? "Expired" : "Next billing"}: {formatDate(subscription.endAt)}</p>
        {overview.cancellationScheduled && <p className="relative mt-3 rounded-xl bg-black/15 px-4 py-3 text-sm">Cancellation scheduled for the end of this billing period.</p>}
        {overview.scheduledPlanCode && <p className="relative mt-3 rounded-xl bg-black/15 px-4 py-3 text-sm">Plan change to {overview.scheduledPlanCode} is scheduled for period end.</p>}
      </div>

      <section><h2 className="mb-5 text-2xl font-bold text-[#08184a]">Usage Overview</h2><div className="grid gap-5 md:grid-cols-2"><UsageCard label="Properties Used" used={overview.propertiesUsed} limit={propertiesLimit} color="bg-[#ff4b1f]" /><UsageCard label="Units Used" used={overview.unitsUsed} limit={unitsLimit} color="bg-emerald-500" /></div></section>

      <section><h2 className="mb-5 text-2xl font-bold text-[#08184a]">Included Features</h2><div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-7 md:grid-cols-2">{plan.features?.filter(feature => feature.enabled).map(feature => <div key={feature.featureKey} className="flex gap-3 text-slate-600"><Check className="h-5 w-5 text-emerald-500" /> {feature.featureKey.replaceAll("_", " ")}</div>)}</div></section>

      <section className="rounded-3xl border border-slate-200 bg-white p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-bold text-[#08184a]">Automatic renewal</h2><p className="mt-1 text-sm text-slate-500">Prepare the next renewal and notify you when provider authorization is required.</p></div><button disabled={mutating || needsRenewal} onClick={() => void mutate(() => updateSubscriptionAutoRenew(token!, subscriptionRole, product, !subscription.autoRenew), `Automatic renewal ${subscription.autoRenew ? "disabled" : "enabled"}.`)} className={`relative h-8 w-14 rounded-full transition ${subscription.autoRenew ? "bg-emerald-500" : "bg-slate-300"}`}><span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${subscription.autoRenew ? "left-7" : "left-1"}`} /></button></div></section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {needsRenewal ? <button onClick={() => setRenewOpen(true)} className="rounded-xl bg-[#ff4b1f] px-5 py-4 font-bold text-white">Restore Subscription</button> : <button onClick={() => router.push("/dashboard/upgrade-plan")} className="rounded-xl bg-[#08184a] px-5 py-4 font-bold text-white">Change Plan</button>}
        <button onClick={() => setView("billing")} className="rounded-xl border-2 border-[#ff4b1f] px-5 py-4 font-bold text-[#ff4b1f]">Billing History</button>
        {overview.cancellationScheduled ? <button disabled={mutating} onClick={() => void mutate(() => restoreSubscriptionCancellation(token!, subscriptionRole, product), "Cancellation removed.")} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 px-5 py-4 font-bold text-emerald-700"><RotateCcw className="h-4 w-4" /> Keep My Plan</button> : !needsRenewal && <button onClick={() => setCancelOpen(true)} className="rounded-xl border border-slate-300 px-5 py-4 font-bold text-slate-500">Cancel Plan</button>}
        {overview.scheduledPlanCode ? <button disabled={mutating} onClick={() => void mutate(() => revokeSubscriptionPlanChange(token!, subscriptionRole, product), "Scheduled plan change removed.")} className="flex items-center justify-center gap-2 rounded-xl border border-amber-300 px-5 py-4 font-bold text-amber-700"><RotateCcw className="h-4 w-4" /> Keep Current Tier</button> : !needsRenewal && <button onClick={() => setRenewOpen(true)} className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-4 font-bold text-slate-600"><CalendarClock className="h-4 w-4" /> Renew Early</button>}
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}><DialogContent className="max-w-lg rounded-3xl"><DialogTitle className="text-2xl font-bold text-[#08184a]">Cancel {plan.displayName}?</DialogTitle><p className="text-slate-500">Your premium features will remain available until {formatDate(subscription.endAt)}.</p><textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={500} placeholder="Tell us your reason (optional)" className="min-h-28 w-full rounded-xl border border-slate-300 p-4 outline-none focus:border-[#ff4b1f]" /><div className="flex gap-3"><button onClick={() => setCancelOpen(false)} className="flex-1 rounded-xl bg-[#08184a] py-3 font-bold text-white">Keep My Plan</button><button disabled={mutating} onClick={() => void mutate(() => cancelSubscription(token!, subscriptionRole, product, reason), "Cancellation scheduled.").then(() => setCancelOpen(false))} className="flex-1 rounded-xl border border-red-300 py-3 font-bold text-red-600">Confirm Cancellation</button></div></DialogContent></Dialog>

      <SubscriptionCheckoutModal open={renewOpen} plan={plan} role={subscription.role} product={product} token={token!} mode="renew" onClose={() => setRenewOpen(false)} onComplete={() => void load()} />
    </div>
  );
}
