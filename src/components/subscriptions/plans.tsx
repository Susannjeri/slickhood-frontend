"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, updatePlanStatus } from "@/services/subscription.service";
import { SubscriptionPlan, SubscriptionPlanResponse } from "@/types/subscription";
import { apiErrorMessage } from "@/lib/api-error";
import PlanModal, { PlanPayload } from "./plan-modal";

const FETCH_SIZE = 100;
const RETIRED_ALIASES = new Set(["STARTER", "STANDARD", "STANDARD_AFFILIATE"]);
const CATEGORIES = ["LANDLORD", "ESTATE_MANAGEMENT", "PROPERTY_SALES", "SERVICE_PROVIDER", "AFFILIATE", "ASSET_PORTFOLIO_MANAGER"];
const TIER_NAMES = new Set(["BRONZE", "SILVER", "GOLD", "PLATINUM"]);
const PRODUCT_ORDER = ["LANDLORD", "ESTATE_MANAGEMENT", "PROPERTY_SALES", "MY_WEALTH", "SERVICES", "SOKO", "AFFILIATE", "GATE_MANAGEMENT_ADDON", "LISTING_ADDON", "PORTFOLIO_MANAGEMENT_ADDON"];

type PlanGroup = {
    key: string;
    displayName: string;
    productKey: string;
    tierRank: number;
    plans: SubscriptionPlan[];
};

const quota = (plan: SubscriptionPlan | undefined, key: string) => {
    const value = plan?.quotas?.find(item => item.metricKey === key)?.limitValue;
    return value === -1 ? "Unlimited" : value ?? "—";
};

const productLabel = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());

const priceLabel = (plan: SubscriptionPlan | undefined) => {
    if (!plan) return "—";
    if (plan.purchaseMode === "FREE") return "No recurring fee";
    if (plan.purchaseMode === "SALES_MANAGED") return "Custom quote";
    return `${plan.currency} ${Number(plan.price).toLocaleString()}`;
};

const groupingKey = (plan: SubscriptionPlan) => {
    const tier = plan.displayName.trim().toUpperCase();
    return TIER_NAMES.has(tier) ? `${plan.productKey}|${tier}` : `${plan.productKey}|${plan.code}`;
};

export default function Plans() {
    const token = useAuthStore(state => state.token);
    const permissions = useAuthStore(state => state.permissions);
    const canEdit = permissions.includes("edit_subscription_plan");
    const canCreate = permissions.includes("create_subscription_plan");
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
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
        const timer = setTimeout(() => setDebounced(search), 350);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        let cancelled = false;
        if (!token) { setLoading(false); return; }
        setLoading(true);
        setError("");

        const load = async () => {
            const first = await getSubscriptionPlans(token, 0, FETCH_SIZE, category, { active: showRetired ? undefined : true, search: debounced });
            const firstResult = first.data as SubscriptionPlanResponse;
            const firstPlans = Array.isArray(firstResult.data) ? firstResult.data : [];
            const pageCount = Math.max(1, firstResult.totalPages ?? 1);
            if (pageCount === 1) return firstPlans;
            const remaining = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) =>
                getSubscriptionPlans(token, index + 1, FETCH_SIZE, category, { active: showRetired ? undefined : true, search: debounced })
            ));
            return firstPlans.concat(remaining.flatMap(response => {
                const result = response.data as SubscriptionPlanResponse;
                return Array.isArray(result.data) ? result.data : [];
            }));
        };

        load()
            .then(result => { if (!cancelled) setPlans(result); })
            .catch(reason => {
                if (!cancelled) { setPlans([]); setError(apiErrorMessage(reason, "Could not load plans. Please retry.")); }
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [token, category, debounced, showRetired, revision]);

    const groups = useMemo<PlanGroup[]>(() => {
        const grouped = new Map<string, PlanGroup>();
        for (const plan of plans) {
            const key = groupingKey(plan);
            const current = grouped.get(key);
            if (current) current.plans.push(plan);
            else grouped.set(key, {
                key,
                displayName: plan.displayName,
                productKey: plan.productKey || plan.planCategory,
                tierRank: plan.tierRank ?? 0,
                plans: [plan],
            });
        }
        return [...grouped.values()]
            .map(group => ({ ...group, plans: group.plans.sort((a, b) => a.billingCycle === "MONTHLY" ? -1 : b.billingCycle === "MONTHLY" ? 1 : a.code.localeCompare(b.code)) }))
            .sort((a, b) => {
                const left = PRODUCT_ORDER.indexOf(a.productKey);
                const right = PRODUCT_ORDER.indexOf(b.productKey);
                const productDifference = (left < 0 ? PRODUCT_ORDER.length : left) - (right < 0 ? PRODUCT_ORDER.length : right);
                return productDifference || a.tierRank - b.tierRank || a.displayName.localeCompare(b.displayName);
            });
    }, [plans]);

    async function save(payload: PlanPayload) {
        if (!token) throw new Error("Sign in again before saving.");
        if (modal?.plan) await updateSubscriptionPlan(token, modal.plan.code, payload);
        else await createSubscriptionPlan(token, payload);
        setRevision(value => value + 1);
    }

    async function toggle(plan: SubscriptionPlan) {
        if (!token || lock.current) return;
        if (plan.active && !window.confirm(`Retire ${plan.displayName} (${plan.billingCycle.toLowerCase()}) from new purchases? Existing subscriptions and billing history will be retained.`)) return;
        lock.current = true;
        setBusy(true);
        setError("");
        try {
            await updatePlanStatus(token, plan.code, !plan.active);
            setRevision(value => value + 1);
        } catch (reason) {
            setError(apiErrorMessage(reason, "Plan status could not be changed."));
        } finally {
            lock.current = false;
            setBusy(false);
        }
    }

    return <section className="mt-4 space-y-4">
        <div>
            <h2 className="text-xl font-bold">Subscription catalogue</h2>
            <p className="mt-1 text-sm text-slate-600">One row represents one usable package. Monthly and annual prices are kept together; retired records remain available for audit and never erase subscription or invoice history.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <input aria-label="Search plans" placeholder="Search name or code" value={search} onChange={event => setSearch(event.target.value)} className="rounded-lg border p-2" />
            <select aria-label="Plan category" value={category} onChange={event => setCategory(event.target.value)} className="rounded-lg border p-2">
                <option value="">All business areas</option>
                {CATEGORIES.map(value => <option key={value} value={value}>{productLabel(value)}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showRetired} onChange={event => setShowRetired(event.target.checked)} />Include retired records</label>
            <button onClick={() => setRevision(value => value + 1)} className="rounded-lg border px-3 py-2">Refresh</button>
            {canCreate && <button onClick={() => setModal({ plan: null, readOnly: false })} className="rounded-lg bg-[#FF4B12] px-4 py-2 text-white">Add plan</button>}
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        {loading ? <p role="status">Loading plans…</p> : <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-100"><tr>{["Plan", "Product", "Monthly", "Annual", "Units", "Team seats", "Status", "Actions"].map(heading => <th key={heading} className="p-3">{heading}</th>)}</tr></thead>
                <tbody>
                    {groups.map(group => {
                        const monthly = group.plans.find(plan => plan.billingCycle === "MONTHLY");
                        const annual = group.plans.find(plan => plan.billingCycle === "YEARLY");
                        const primary = monthly ?? annual ?? group.plans[0];
                        const activeCount = group.plans.filter(plan => plan.active).length;
                        const status = activeCount === group.plans.length ? "Active" : activeCount ? "Partly retired" : "Retired";
                        return <tr key={group.key} className="border-t align-top">
                            <td className="p-3"><strong>{group.displayName}</strong><div className="mt-1 text-xs text-slate-500">{group.plans.map(plan => plan.code).join(" · ")}</div></td>
                            <td className="p-3">{productLabel(group.productKey)}</td>
                            <td className="p-3 font-medium">{priceLabel(monthly ?? (primary.purchaseMode === "FREE" ? primary : undefined))}</td>
                            <td className="p-3 font-medium">{priceLabel(annual)}</td>
                            <td className="p-3">{quota(primary, "UNITS")}</td>
                            <td className="p-3">{quota(primary, "TEAM_SEATS")}</td>
                            <td className="p-3">{status}</td>
                            <td className="p-3"><div className="flex min-w-44 flex-col gap-2">
                                {group.plans.map(plan => <div key={plan.code} className="flex flex-wrap items-center gap-1">
                                    {group.plans.length > 1 && <span className="w-12 text-xs text-slate-500">{plan.billingCycle === "YEARLY" ? "Annual" : "Monthly"}</span>}
                                    <button className="rounded border px-2 py-1" onClick={() => setModal({ plan, readOnly: true })}>View</button>
                                    {canEdit && <>
                                        <button className="rounded border px-2 py-1" onClick={() => setModal({ plan, readOnly: false })}>Edit</button>
                                        {!RETIRED_ALIASES.has(plan.code) && <button disabled={busy} className="rounded border px-2 py-1 disabled:opacity-50" onClick={() => void toggle(plan)}>{plan.active ? "Retire" : "Activate"}</button>}
                                    </>}
                                </div>)}
                            </div></td>
                        </tr>;
                    })}
                    {!groups.length && <tr><td className="p-6 text-center" colSpan={8}>No matching plans.</td></tr>}
                </tbody>
            </table>
        </div>}
        <p className="text-sm text-slate-600">{groups.length} usable plan choices · {plans.length} billing records</p>
        {modal && <PlanModal open plan={modal.plan} readOnly={modal.readOnly} onClose={() => setModal(null)} onSubmit={save} />}
    </section>;
}
