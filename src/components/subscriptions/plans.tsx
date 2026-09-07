"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, updatePlanStatus } from "@/services/subscription.service";
import { SubscriptionPlan, SubscriptionPlanResponse } from "@/types/subscription";
import { apiErrorMessage } from "@/lib/api-error";
import PlanModal, { PlanPayload } from "./plan-modal";

const PAGE_SIZE = 10;
const RETIRED_ALIASES = new Set(["STARTER", "STANDARD", "STANDARD_AFFILIATE"]);
const CATEGORIES = ["LANDLORD", "ESTATE_MANAGEMENT", "PROPERTY_SALES", "SERVICE_PROVIDER", "AFFILIATE", "ASSET_PORTFOLIO_MANAGER"];
const quota = (plan: SubscriptionPlan, key: string) => {
    const value = plan.quotas?.find(q => q.metricKey === key)?.limitValue;
    return value === -1 ? "Unlimited" : value ?? "—";
};

export default function Plans() {
    const token = useAuthStore(s => s.token);
    const permissions = useAuthStore(s => s.permissions);
    const canEdit = permissions.includes("edit_subscription_plan");
    const canCreate = permissions.includes("create_subscription_plan");
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [total, setTotal] = useState(0);
    const [category, setCategory] = useState("");
    const [search, setSearch] = useState("");
    const [debounced, setDebounced] = useState("");
    const [showRetired, setShowRetired] = useState(false);
    const [revision, setRevision] = useState(0);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const [modal, setModal] = useState<{ plan: SubscriptionPlan | null; readOnly: boolean } | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => { setDebounced(search); setPage(0); }, 350);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        let cancelled = false;
        if (!token) { setLoading(false); return; }
        setLoading(true);
        setError("");
        getSubscriptionPlans(token, page, PAGE_SIZE, category, { active: showRetired ? undefined : true, search: debounced })
            .then(response => {
                if (cancelled) return;
                const result = response.data as SubscriptionPlanResponse;
                setPlans(Array.isArray(result.data) ? result.data : []);
                setTotal(result.totalElements ?? result.data?.length ?? 0);
                setTotalPages(result.totalPages ?? 1);
            })
            .catch(e => {
                if (!cancelled) { setPlans([]); setError(apiErrorMessage(e, "Could not load plans. Please retry.")); }
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [token, page, category, debounced, showRetired, revision]);

    async function save(payload: PlanPayload) {
        if (!token) throw new Error("Sign in again before saving.");
        if (modal?.plan) await updateSubscriptionPlan(token, modal.plan.code, payload);
        else await createSubscriptionPlan(token, payload);
        setRevision(v => v + 1);
    }

    async function toggle(plan: SubscriptionPlan) {
        if (!token || lock.current) return;
        if (plan.active && !window.confirm("Retire this plan from new purchases? Existing valid subscriptions and billing history will be retained.")) return;
        lock.current = true; setBusy(true); setError("");
        try {
            await updatePlanStatus(token, plan.code, !plan.active);
            setPage(0); setRevision(v => v + 1);
        } catch (e) { setError(apiErrorMessage(e, "Plan status could not be changed.")); }
        finally { lock.current = false; setBusy(false); }
    }

    return <section className="mt-4 space-y-4">
        <div><h2 className="text-xl font-bold">Subscription catalogue</h2>
            <p className="mt-1 text-sm text-slate-600">Active offers are shown by default. Retired plans remain available for audit; they are not deleted. Custom-priced plans require an agreed quote, not free activation.</p></div>
        <div className="flex flex-wrap items-center gap-3">
            <input aria-label="Search plans" placeholder="Search name or code" value={search} onChange={e => setSearch(e.target.value)} className="rounded-lg border p-2" />
            <select aria-label="Plan category" value={category} onChange={e => { setCategory(e.target.value); setPage(0); }} className="rounded-lg border p-2">
                <option value="">All categories</option>{CATEGORIES.map(c => <option key={c} value={c}>{c.replaceAll("_", " ")}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showRetired} onChange={e => { setShowRetired(e.target.checked); setPage(0); }} />Include retired plans</label>
            <button onClick={() => setRevision(v => v + 1)} className="rounded-lg border px-3 py-2">Refresh</button>
            {canCreate && <button onClick={() => setModal({ plan: null, readOnly: false })} className="rounded-lg bg-[#FF4B12] px-4 py-2 text-white">Add Plan</button>}
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        {loading ? <p role="status">Loading plans…</p> : <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm">
            <thead className="bg-slate-100"><tr>{["Plan", "Product", "Billing", "Price", "Units", "Team seats", "Status", "Actions"].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
            <tbody>{plans.map(plan => <tr key={plan.uuid || plan.code} className="border-t">
                <td className="p-3"><strong>{plan.displayName}</strong><div className="font-mono text-xs text-slate-500">{plan.code}</div></td>
                <td className="p-3">{(plan.productKey || plan.planCategory).replaceAll("_", " ")}</td>
                <td className="p-3">{plan.purchaseMode === "FREE" ? "No recurring fee" : plan.billingCycle}</td>
                <td className="p-3">{plan.purchaseMode === "SALES_MANAGED" ? "Custom quote" : Number(plan.price) === 0 ? "Free" : plan.currency + " " + Number(plan.price).toLocaleString()}</td>
                <td className="p-3">{quota(plan, "UNITS")}</td><td className="p-3">{quota(plan, "TEAM_SEATS")}</td>
                <td className="p-3">{plan.active ? "Active" : "Retired"}</td>
                <td className="p-3"><div className="flex gap-2">
                    <button className="rounded border px-2 py-1" onClick={() => setModal({ plan, readOnly: true })}>View</button>
                    {canEdit && <><button className="rounded border px-2 py-1" onClick={() => setModal({ plan, readOnly: false })}>Edit</button>
                        {!RETIRED_ALIASES.has(plan.code) && <button disabled={busy} className="rounded border px-2 py-1 disabled:opacity-50" onClick={() => void toggle(plan)}>{plan.active ? "Retire" : "Activate"}</button>}</>}
                </div></td>
            </tr>)}
            {!plans.length && <tr><td className="p-6 text-center" colSpan={8}>No matching plans.</td></tr>}</tbody>
        </table></div>}
        <div className="flex items-center justify-between text-sm"><span>{total} matching plans · Page {totalPages ? page + 1 : 0} of {totalPages}</span>
            <div className="flex gap-2"><button className="rounded border px-3 py-2 disabled:opacity-40" disabled={loading || page === 0} onClick={() => setPage(v => v - 1)}>Previous</button>
                <button className="rounded border px-3 py-2 disabled:opacity-40" disabled={loading || page + 1 >= totalPages} onClick={() => setPage(v => v + 1)}>Next</button></div></div>
        {modal && <PlanModal open plan={modal.plan} readOnly={modal.readOnly} onClose={() => setModal(null)} onSubmit={save} />}
    </section>;
}
