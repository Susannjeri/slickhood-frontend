"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubscriptionPlan } from "@/types/subscription";
import SuccessModal from "../common/successmodal";

const PLAN_CATEGORIES = [
    "LANDLORD",
    "ESTATE_MANAGEMENT",
    "PROPERTY_SALES",
    "SERVICE_PROVIDER",
    "AFFILIATE",
    "ASSET_PORTFOLIO_MANAGER",
];

const ROLE_FAMILIES = [
    "LANDLORD",
    "ESTATE_MANAGER",
    "SALES_AGENT",
    "SERVICE_PROVIDER",
    "AFFILIATE",
    "ASSET_PORTFOLIO_MANAGER",
];

interface PlanModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (payload: PlanPayload) => Promise<void>;
    plan?: SubscriptionPlan | null;
    readOnly?: boolean; // null = create mode
}

export interface PlanPayload {
    code: string;
    displayName: string;
    planCategory: string;
    roleFamily: string;
    billingCycle: string;
    price: number;
    currency: string;
    features: { featureKey: string; enabled: boolean }[];
    quotas: { metricKey: string; limitValue: number }[];
}

interface FormErrors {
    code?: string;
    displayName?: string;
    planCategory?: string;
    roleFamily?: string;
    billingCycle?: string;
    price?: string;
    currency?: string;
    features?: string;
    quotas?: string;
}

const EMPTY_FORM: PlanPayload = {
    code: "",
    displayName: "",
    planCategory: "",
    roleFamily: "",
    billingCycle: "MONTHLY",
    price: 0,
    currency: "KES",
    features: [],
    quotas: [
        { metricKey: "MAX_PROPERTIES", limitValue: 0 },
        { metricKey: "MAX_UNITS", limitValue: 0 },
    ],
};

export default function PlanModal({ open, onClose, onSubmit, plan, readOnly = false }: PlanModalProps) {
    const isEdit = !!plan;

    const [form, setForm] = useState<PlanPayload>(EMPTY_FORM);
    const [errors, setErrors] = useState<FormErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (plan) {
            setForm({
                code: plan.code,
                displayName: plan.displayName,
                planCategory: plan.planCategory,
                roleFamily: plan.roleFamily,
                billingCycle: plan.billingCycle,
                price: plan.price,
                currency: plan.currency,
                features: plan.features?.length ? plan.features : [],
                quotas: plan.quotas?.length
                    ? plan.quotas
                    : [
                        { metricKey: "MAX_PROPERTIES", limitValue: 0 },
                        { metricKey: "MAX_UNITS", limitValue: 0 },
                    ],
            });
        } else {
            setForm(EMPTY_FORM);
        }
        setErrors({});
    }, [plan, open]);

    const validate = (): boolean => {
        const e: FormErrors = {};

        // Basic Information
        if (!form.code.trim()) e.code = "Code is required.";
        else if (!/^[A-Z0-9_-]+$/i.test(form.code)) e.code = "Code may only contain letters, numbers, hyphens, and underscores.";
        if (!form.displayName.trim()) e.displayName = "Display name is required.";
        if (!form.planCategory) e.planCategory = "Category is required.";
        if (!form.roleFamily) e.roleFamily = "Role family is required.";

        // Pricing & Billing
        if (!form.billingCycle) e.billingCycle = "Billing cycle is required.";
        if (form.price === 0 || form.price === null || form.price === undefined) {
            e.price = "Price is required.";
        } else if (form.price < 0) {
            e.price = "Price cannot be negative.";
        }
        if (!form.currency) e.currency = "Currency is required.";

        // Usage Limits
        const maxProps = form.quotas.find((q) => q.metricKey === "MAX_PROPERTIES");
        const maxUnits = form.quotas.find((q) => q.metricKey === "MAX_UNITS");
        if (!maxProps || maxProps.limitValue === 0) {
            e.quotas = "Max Properties is required.";
        } else if (!maxUnits || maxUnits.limitValue === 0) {
            e.quotas = "Max Units is required.";
        } else if (form.quotas.some((q) => q.limitValue < 0)) {
            e.quotas = "Quota values cannot be negative.";
        }

        // Features
        if (form.features.length === 0) e.features = "At least one feature is required.";
        else if (form.features.some((f) => !f.featureKey.trim())) e.features = "Feature keys cannot be empty.";

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const updateFeatureEnabled = (
        index: number,
        enabled: boolean
    ) => {
        const next = [...form.features];
        next[index] = {
            ...next[index],
            enabled,
        };

        setForm({
            ...form,
            features: next,
        });
    };


    const handleSubmit = async () => {
        if (!validate()) return;

        setSubmitting(true);

        try {
            await onSubmit(form);

            setShowSuccess(true);
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const set = <K extends keyof PlanPayload>(key: K, value: PlanPayload[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

    const addFeature = () =>
        setForm((prev) => ({ ...prev, features: [...prev.features, { featureKey: "", enabled: true }] }));

    const removeFeature = (i: number) =>
        setForm((prev) => ({ ...prev, features: prev.features.filter((_, idx) => idx !== i) }));

    const updateFeature = (i: number, key: string) =>
        setForm((prev) => ({
            ...prev,
            features: prev.features.map((f, idx) => (idx === i ? { ...f, featureKey: key } : f)),
        }));

    const updateQuota = (metricKey: string, value: number) =>
        setForm((prev) => ({
            ...prev,
            quotas: prev.quotas.map((q) => (q.metricKey === metricKey ? { ...q, limitValue: value } : q)),
        }));

    if (!open) return null;

    if (showSuccess) {
        return (
            <SuccessModal
                open={true}
                title="Success"
                message="Subscription plan created successfully."
                onClose={() => {
                    setShowSuccess(false);
                    onClose();
                }}
            />
        );
    }

    return (


        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 max-h-[92vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-white">
                    <div>
                        <h2 className="text-2xl font-bold text-[#08184A]">
                            {isEdit ? "Edit Subscription Plan" : "Add Subscription Plan"}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Configure pricing, limits and features available in this plan.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 space-y-6 flex-1">

                    {/* BASIC INFORMATION */}
                    <section className="rounded-2xl border border-gray-200 bg-white p-5">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="h-5 w-1 rounded-full bg-[#FF4B12]" />
                            <h3 className="text-base font-bold text-[#08184A]">
                                Basic Information
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-[#08184A] mb-2">
                                    Code <span className="text-[#FF4B12]">*</span>
                                </label>
                                <input
                                    value={form.code}
                                    onChange={(e) => set("code", e.target.value.toUpperCase())}
                                    disabled={isEdit}
                                    placeholder="e.g. BRONZE"
                                    className={cn(
                                        "w-full px-4 py-3 text-sm rounded-xl border bg-white text-[#08184A] placeholder-gray-300",
                                        "focus:outline-none focus:ring-2 focus:ring-[#08184A]/20 focus:border-[#08184A]/40 transition",
                                        "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed",
                                        errors.code ? "border-red-400" : "border-gray-200"
                                    )}
                                />
                                {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#08184A] mb-2">
                                    Display Name <span className="text-[#FF4B12]">*</span>
                                </label>
                                <input
                                    value={form.displayName}
                                    onChange={(e) => set("displayName", e.target.value)}
                                    placeholder="e.g. Bronze"
                                    className={cn(
                                        "w-full px-4 py-3 text-sm rounded-xl border bg-white text-[#08184A] placeholder-gray-300",
                                        "focus:outline-none focus:ring-2 focus:ring-[#08184A]/20 focus:border-[#08184A]/40 transition",
                                        errors.displayName ? "border-red-400" : "border-gray-200"
                                    )}
                                />
                                {errors.displayName && <p className="text-xs text-red-500 mt-1">{errors.displayName}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5 mt-5">
                            <div>
                                <label className="block text-sm font-semibold text-[#08184A] mb-2">
                                    Plan Category <span className="text-[#FF4B12]">*</span>
                                </label>
                                <select
                                    value={form.planCategory}
                                    onChange={(e) => set("planCategory", e.target.value)}
                                    className={cn(
                                        "w-full px-4 py-3 text-sm rounded-xl border bg-white text-[#08184A]",
                                        "focus:outline-none focus:ring-2 focus:ring-[#08184A]/20 focus:border-[#08184A]/40 transition",
                                        errors.planCategory ? "border-red-400" : "border-gray-200"
                                    )}
                                >
                                    <option value="">Select category</option>
                                    {PLAN_CATEGORIES.map((c) => (
                                        <option key={c} value={c}>
                                            {c.replaceAll("_", " ")}
                                        </option>
                                    ))}
                                </select>
                                {errors.planCategory && <p className="text-xs text-red-500 mt-1">{errors.planCategory}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#08184A] mb-2">
                                    Role Family <span className="text-[#FF4B12]">*</span>
                                </label>
                                <select
                                    value={form.roleFamily}
                                    onChange={(e) => set("roleFamily", e.target.value)}
                                    className={cn(
                                        "w-full px-4 py-3 text-sm rounded-xl border bg-white text-[#08184A]",
                                        "focus:outline-none focus:ring-2 focus:ring-[#08184A]/20 focus:border-[#08184A]/40 transition",
                                        errors.roleFamily ? "border-red-400" : "border-gray-200"
                                    )}
                                >
                                    <option value="">Select role family</option>
                                    {ROLE_FAMILIES.map((c) => (
                                        <option key={c} value={c}>
                                            {c.replaceAll("_", " ")}
                                        </option>
                                    ))}
                                </select>
                                {errors.roleFamily && <p className="text-xs text-red-500 mt-1">{errors.roleFamily}</p>}
                            </div>
                        </div>
                    </section>

                    {/* PRICING & BILLING */}
                    <section className="rounded-2xl border border-gray-200 bg-white p-5">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="h-5 w-1 rounded-full bg-[#FF4B12]" />
                            <h3 className="text-base font-bold text-[#08184A]">
                                Pricing & Billing
                            </h3>
                        </div>

                        <div className="grid grid-cols-3 gap-5">

                            {/* Billing Cycle */}
                            <div>
                                <label className="block text-sm font-semibold text-[#08184A] mb-2">
                                    Billing Cycle
                                </label>

                                <select
                                    value={form.billingCycle}
                                    onChange={(e) => set("billingCycle", e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm"
                                >
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="QUARTERLY">Quarterly</option>
                                    <option value="YEARLY">Yearly</option>
                                </select>
                            </div>

                            {/* Price */}
                            <div>
                                <label className="block text-sm font-semibold text-[#08184A] mb-2">
                                    Price
                                </label>

                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={form.price === 0 ? "" : form.price}
                                    onChange={(e) => set("price", parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)}
                                    placeholder="0.00"
                                    className={cn(
                                        "w-full px-4 py-3 rounded-xl border bg-white text-sm",
                                        errors.price ? "border-red-400" : "border-gray-200"
                                    )}
                                />
                                {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}

                            </div>

                            {/* Currency */}
                            <div>
                                <label className="block text-sm font-semibold text-[#08184A] mb-2">
                                    Currency
                                </label>

                                <select
                                    value={form.currency}
                                    onChange={(e) => set("currency", e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm"
                                >
                                    <option value="KES">KES</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                </select>
                            </div>

                        </div>
                    </section>
                    {/* USAGE LIMITS */}
                    <section className="rounded-2xl border border-gray-200 bg-white p-5">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="h-5 w-1 rounded-full bg-[#FF4B12]" />
                            <h3 className="text-base font-bold text-[#08184A]">
                                Usage Limits
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {form.quotas.map((q) => (
                                <div
                                    key={q.metricKey}
                                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                                >
                                    <label className="block text-sm font-semibold text-[#08184A] mb-2">
                                        {q.metricKey.replaceAll("_", " ")}
                                    </label>

                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={q.limitValue === 0 ? "" : q.limitValue}
                                        onChange={(e) => updateQuota(q.metricKey, parseInt(e.target.value.replace(/\D/g, "")) || 0)}
                                        placeholder="0"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white"
                                    />

                                </div>
                            ))}
                        </div>

                        {errors.quotas && (
                            <p className="text-xs text-red-500 mt-2">{errors.quotas}</p>
                        )}
                    </section>

                    <section className="rounded-2xl border border-gray-200 bg-white p-5">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="h-5 w-1 rounded-full bg-[#FF4B12]" />
                                <h3 className="text-base font-bold text-[#08184A]">
                                    Features
                                </h3>
                            </div>

                            <button
                                onClick={addFeature}
                                className="flex items-center gap-2 bg-[#FF4B12]/10 text-[#FF4B12] px-4 py-2 rounded-xl font-semibold hover:bg-[#FF4B12]/20 transition"
                            >
                                <Plus className="w-4 h-4" />
                                Add Feature
                            </button>
                        </div>

                        {form.features.length === 0 ? (
                            <p className="text-sm text-gray-400 py-3">
                                No features added yet.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {form.features.map((f, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-4 p-3 rounded-xl border border-gray-200 bg-gray-50"
                                    >
                                        {/* Feature Name */}
                                        <input
                                            value={f.featureKey}
                                            onChange={(e) => updateFeature(i, e.target.value)}
                                            placeholder="e.g. Analytics Reports"
                                            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white"
                                        />

                                        {/* Enabled/Disabled dropdown */}
                                        <select
                                            value={String(f.enabled)}
                                            onChange={(e) => updateFeatureEnabled(i, e.target.value === "true")}
                                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                                        >
                                            <option value="true">Enabled</option>
                                            <option value="false">Disabled</option>
                                        </select>

                                        {/* Delete */}
                                        <button
                                            type="button"
                                            onClick={() => removeFeature(i)}
                                            className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {errors.features && (
                            <p className="text-xs text-red-500 mt-2">{errors.features}</p>
                        )}
                    </section>

                </div>
                {/* Footer */}
                {/* Footer */}
                <div className="flex items-center justify-end gap-4 px-8 py-5 border-t border-gray-200 bg-white">
                    <button
                        onClick={onClose}
                        className="px-5 py-3 rounded-xl border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50"
                    >
                        {readOnly ? "Close" : "Cancel"}
                    </button>

                    {!readOnly && (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="px-6 py-3 rounded-xl bg-[#FF4B12] text-white font-semibold hover:bg-[#e63d0f] disabled:opacity-60 transition"
                        >
                            {submitting ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                            ) : isEdit ? (
                                "Save Changes"
                            ) : (
                                "Add Plan"
                            )}
                        </button>
                    )}
                </div>


            </div>




        </div>



    );
}
