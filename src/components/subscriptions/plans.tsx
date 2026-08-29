"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getSubscriptionPlans, getPlanByCode, createSubscriptionPlan, updateSubscriptionPlan, updatePlanStatus } from "@/services/subscription.service";
import { SubscriptionPlan } from "@/types/subscription";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Plus, Pencil, ChevronDown, Search, Eye } from "lucide-react";
import PlanModal, { PlanPayload } from "./plan-modal";

const PAGE_SIZE = 7;

const CATEGORIES = [
    { label: "All Categories", value: "" },
    { label: "Landlord", value: "LANDLORD" },
    { label: "Estate Management", value: "ESTATE_MANAGEMENT" },
    { label: "Property Sales", value: "PROPERTY_SALES" },
    { label: "Service Provider", value: "SERVICE_PROVIDER" },
    { label: "Affiliate", value: "AFFILIATE" },
    { label: "SlickHood Wealth", value: "ASSET_PORTFOLIO_MANAGER" },
];

export default function Plans() {
    const token = useAuthStore((s) => s.token);

    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [category, setCategory] = useState("");
    const [codeSearch, setCodeSearch] = useState("");
    const [debouncedCode, setDebouncedCode] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const [viewingPlan, setViewingPlan] = useState<SubscriptionPlan | null>(null);
    const [readOnly, setReadOnly] = useState(false);

    // Debounce code input
    useEffect(() => {
        const t = setTimeout(() => setDebouncedCode(codeSearch), 400);
        return () => clearTimeout(t);
    }, [codeSearch]);

    useEffect(() => {
        const loadPlans = async () => {
            if (!token) return;
            setLoading(true);
            try {
                if (debouncedCode.trim()) {
                    // Search by code — returns an array just like the list endpoint
                    const response = await getPlanByCode(token, debouncedCode);
                    setPlans(response.data.data || []);
                } else {
                    const response = await getSubscriptionPlans(token, 0, 100, category);
                    setPlans(response.data.data || []);
                }
                setPage(1);
            } catch (error) {
                console.error("Failed to fetch plans:", error);
                setPlans([]);
            } finally {
                setLoading(false);
            }
        };
        loadPlans();
    }, [token, category, debouncedCode]);

    const handleSubmit = async (payload: PlanPayload) => {
        try {
            if (editingPlan) {
                await updateSubscriptionPlan(token!, payload.code, payload
                );
            } else {
                await createSubscriptionPlan(token!, payload);
            }

            const response = await getSubscriptionPlans(token!, 0, 100, category);
            setPlans(response.data.data || []);

        } catch (error) {
            console.error("Failed to save plan:", error);
            throw error;
        }
    };

    const openCreate = () => {
        setEditingPlan(null);
        setViewingPlan(null);
        setReadOnly(false);
        setModalOpen(true);
    };

    const openEdit = (plan: SubscriptionPlan) => {
        setEditingPlan(plan);
        setViewingPlan(null);
        setReadOnly(false);
        setModalOpen(true);
    };

    const openView = (plan: SubscriptionPlan) => {
        setViewingPlan(plan);
        setEditingPlan(null);
        setReadOnly(true);
        setModalOpen(true);
    };

    const totalPages = Math.ceil(plans.length / PAGE_SIZE);
    const paginated = plans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleToggleStatus = async (
        code: string,
        active: boolean
    ) => {
        try {
            await updatePlanStatus(token!, code, !active);

            const response = await getSubscriptionPlans(
                token!,
                0,
                100,
                category
            );

            setPlans(response.data.data || []);
        } catch (error) {
            console.error("Failed to update plan status:", error);
        }
    };

    return (
        <div className="mt-3">

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4 gap-3">

                {/* Left: code search + category dropdown */}
                <div className="flex items-center gap-3">

                    {/* Code search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={codeSearch}
                            onChange={(e) => {
                                setCodeSearch(e.target.value);
                                // Clear category when searching by code
                                if (e.target.value) setCategory("");
                            }}
                            placeholder="Search by code..."
                            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-white text-[#08184A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#08184A]/20 focus:border-[#08184A]/40 w-48 transition"
                        />
                    </div>

                    {/* Category dropdown — disabled while code search is active */}
                    <div className="relative">
                        <select
                            value={category}
                            disabled={!!codeSearch}
                            onChange={(e) => setCategory(e.target.value)}
                            className="appearance-none pl-4 pr-9 py-2 text-sm rounded-xl border border-gray-200 bg-white text-[#08184A] focus:outline-none focus:ring-2 focus:ring-[#08184A]/20 focus:border-[#08184A]/40 transition cursor-pointer w-52 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Add Plan */}
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-[#FF4B12] hover:bg-[#FF4B12]/90 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
                    <Plus className="w-4 h-4" />
                    Add Plan
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-[#08184A] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#08184A]/15 text-[#08184A] font-bold">
                                    <th className="text-left px-5 py-3.5 font-semibold tracking-wide text-xs uppercase">Display Name</th>
                                    <th className="text-left px-5 py-3.5 font-semibold tracking-wide text-xs uppercase">Code</th>
                                    <th className="text-left px-5 py-3.5 font-semibold tracking-wide text-xs uppercase">Category</th>
                                    <th className="text-left px-5 py-3.5 font-semibold tracking-wide text-xs uppercase">Billing</th>
                                    <th className="text-left px-5 py-3.5 font-semibold tracking-wide text-xs uppercase">Price</th>
                                    <th className="text-left px-5 py-3.5 font-semibold tracking-wide text-xs uppercase">Max Properties</th>
                                    <th className="text-left px-5 py-3.5 font-semibold tracking-wide text-xs uppercase">Max Units</th>
                                    <th className="text-center px-5 py-3.5 font-semibold tracking-wide text-xs uppercase">Status</th>
                                    <th className="text-center px-5 py-3.5 font-semibold tracking-wide text-xs uppercase">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-5 py-12 text-center text-gray-400 text-sm">
                                            No subscription plans found.
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((plan, i) => (
                                        <tr
                                            key={plan.uuid}
                                            className={`transition-colors hover:bg-[#08184A]/[0.03] ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                                                }`}
                                        >
                                            {/* Display Name */}
                                            <td className="px-5 py-4 font-semibold text-[#08184A]">
                                                {plan.displayName}
                                            </td>

                                            {/* Code */}
                                            <td className="px-5 py-4">
                                                <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                                                    {plan.code}
                                                </span>
                                            </td>

                                            {/* Category */}
                                            <td className="px-5 py-4">
                                                <span className="text-[#08184A] text-xs font-medium">
                                                    {plan.planCategory.replaceAll("_", " ")}
                                                </span>
                                            </td>

                                            {/* Billing cycle */}
                                            <td className="px-5 py-4 text-gray-500 capitalize">
                                                {plan.billingCycle.charAt(0) + plan.billingCycle.slice(1).toLowerCase()}
                                            </td>

                                            {/* Price */}
                                            <td className="px-5 py-4">
                                                {plan.price === 0 ? (
                                                    <span className="font-semibold text-green-600">Free</span>
                                                ) : (
                                                    <span className="font-semibold text-[#08184A]">
                                                        {plan.currency}{" "}
                                                        {Number(plan.price).toLocaleString()}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Max Properties */}
                                            <td className="px-5 py-4 text-sm">
                                                {plan.quotas?.find((q) => q.metricKey === "MAX_PROPERTIES")?.limitValue ?? (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>

                                            {/* Max Units */}
                                            <td className="px-5 py-4 text-sm">
                                                {plan.quotas?.find((q) => q.metricKey === "MAX_UNITS")?.limitValue ?? (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-4 text-center">
                                                {plan.active ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openView(plan)}
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => openEdit(plan)}
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#08184A] border border-[#08184A]/20 px-3 py-1.5 rounded-lg hover:bg-[#08184A] hover:text-white transition"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                        Edit
                                                    </button>

                                                    <button
                                                        onClick={() => handleToggleStatus(plan.code, plan.active)}
                                                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${plan.active
                                                            ? "text-red-600 border border-red-200 hover:bg-red-600 hover:text-white"
                                                            : "text-green-600 border border-green-200 hover:bg-green-600 hover:text-white"
                                                            }`}
                                                    >
                                                        {plan.active ? (
                                                            <>
                                                                <XCircle className="w-3 h-3" />
                                                                Deactivate
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                Activate
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination footer */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-white">
                        <p className="text-xs text-gray-400">
                            Showing{" "}
                            <span className="font-medium text-[#08184A]">
                                {Math.min((page - 1) * PAGE_SIZE + 1, plans.length)}–
                                {Math.min(page * PAGE_SIZE, plans.length)}
                            </span>{" "}
                            of{" "}
                            <span className="font-medium text-[#08184A]">{plans.length}</span> plans
                        </p>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg text-[#08184A] hover:bg-[#08184A]/8 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${p === page
                                        ? "bg-[#FF4B12] text-white"
                                        : "text-[#08184A] hover:bg-[#08184A]/8"
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}

                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg text-[#08184A] hover:bg-[#08184A]/8 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PlanModal
                open={modalOpen}
                plan={editingPlan || viewingPlan}
                readOnly={readOnly}
                onClose={() => {
                    setModalOpen(false);
                    setReadOnly(false);
                }}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
