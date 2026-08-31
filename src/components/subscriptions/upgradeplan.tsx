"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import {
    getCurrentSubscription,
    getSubscriptionCatalog,
    getSubscriptionPlans,
    requestSubscriptionSalesContact,
    scheduleSubscriptionPlanChange,
    subscriptionRoleForTitle,
} from "@/services/subscription.service";
import { SubscriptionPlan } from "@/types/subscription";
import SubscriptionCheckoutModal from "./SubscriptionCheckoutModal";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { businessAreas } from "@/config/businessAreas";

interface CurrentSubscription {
    planCode?: string;
    status?: string;
    planDetails: { code: string; displayName: string; price: number; tierRank?: number };
}

export default function UpgradePlan() {

    const token = useAuthStore((s) => s.token);
    const activeRole = useAuthStore((s) => s.activeRole);
    const selectedBusinessAreaId = useAuthStore((s) => s.selectedBusinessAreaId);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
    const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
    const [downgradePlan, setDowngradePlan] = useState<SubscriptionPlan | null>(null);
    const [salesPlan, setSalesPlan] = useState<SubscriptionPlan | null>(null);
    const [salesMessage, setSalesMessage] = useState("");
    const [salesRequestSubmitted, setSalesRequestSubmitted] = useState(false);
    const [mutating, setMutating] = useState(false);

    const category = activeRole?.title === "Superadmin"
        ? ""
        : subscriptionRoleForTitle(activeRole?.title) ?? "";
    const selectedProduct = businessAreas.find(area => area.id === selectedBusinessAreaId)?.subscriptionProduct;


    useEffect(() => {
        const loadCurrentSubscription = async () => {
            if (!token) return;

            try {
                const response = await getCurrentSubscription(token, category || undefined, selectedProduct);

                setCurrentSubscription(
                    response.data?.data?.[0] || null
                );
            } catch (error) {
                console.error(
                    "Failed to load current subscription:",
                    error
                );
            }
        };

        loadCurrentSubscription();
    }, [token, category, selectedProduct]);

    useEffect(() => {
        const loadPlans = async () => {
            if (!token) return;

            try {
                const response = category
                    ? await getSubscriptionCatalog(token, category, selectedProduct)
                    : await getSubscriptionPlans(token, 0, 50);

                setPlans(
                    (response.data.data || []).filter(
                        (plan: SubscriptionPlan) => plan.active
                    )
                );
            } catch (error) {
                console.error("Failed to load plans:", error);
            } finally {
                setLoading(false);
            }
        };

        loadPlans();
    }, [token, category, selectedProduct]);

    const sortedPlans = [...plans].sort((a, b) => {
        const currentPlanCode =
            currentSubscription?.planDetails?.code;

        if (a.code === currentPlanCode) return -1;
        if (b.code === currentPlanCode) return 1;

        return 0;
    });

    return (

        <div className="space-y-8 p-5">



            <div className="rounded-2xl border border-[#020B2D]/10 bg-white px-6 py-4 shadow-sm">
                <div className="flex flex-col items-center text-center">
                    {currentSubscription && (
                        <span className="inline-flex items-center rounded-full bg-[#FF4B1F]/10 border border-[#FF4B1F]/20 px-4 py-1 text-xs font-semibold text-[#FF4B1F]">
                            Current Plan • {currentSubscription.planDetails.displayName}
                        </span>
                    )}

                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#020B2D]">
                        Upgrade Your Subscription
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm text-gray-500">
                        You&apos;re currently on the{" "}
                        <span className="font-semibold text-[#020B2D]">
                            {currentSubscription?.planDetails.displayName ?? "current"}
                        </span>{" "}
                        plan. Compare available plans below and upgrade whenever you&apos;re ready to
                        unlock more features and higher limits.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    Loading plans...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sortedPlans.map((plan) => {
                        const isCurrentPlan =
                            currentSubscription?.planDetails?.code === plan.code;
                        const isDowngrade = currentSubscription?.status === "ACTIVE"
                            && Number(plan.tierRank ?? 0) < Number(currentSubscription.planDetails.tierRank ?? 0);
                        const isCustomPlan = plan.purchaseMode === "SALES_MANAGED";

                        return (
                            <div
                                key={plan.uuid}
                                className={`overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.02]
            ${isCurrentPlan
                                        ? "bg-white border-2 border-[#FF4B1F] ring-4 ring-[#FF4B1F]/10 shadow-lg"
                                        : "bg-white border border-gray-200 shadow-sm"
                                    }`}
                            >
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            {isCurrentPlan && (
                                                <span className="inline-flex items-center rounded-full bg-[#FF4B1F]/10 text-[#FF4B1F] px-3 py-1 text-xs font-semibold border border-[#FF4B1F]/20">
                                                    Current Plan
                                                </span>
                                            )}
                                        </div>

                                        {isCurrentPlan && (
                                            <span className="h-3 w-3 rounded-full bg-[#FF4B1F]" />
                                        )}
                                    </div>

                                    <h2 className="text-2xl font-bold text-[#020B2D]">
                                        {plan.displayName}
                                    </h2>

                                    <p className="text-gray-500 text-sm mt-1">
                                        Billed {plan.billingCycle.toLowerCase()}
                                    </p>

                                    <div className="mt-5">
                                        {isCustomPlan ? (
                                            <span className="text-3xl font-bold text-[#020B2D]">Tailored pricing</span>
                                        ) : (
                                            <span className="text-4xl font-bold text-[#020B2D]">
                                                {plan.currency}{" "}
                                                {Number(plan.price).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="px-6 pb-6">
                                    {/* Features */}
                                    {plan.features?.length > 0 && (
                                        <>
                                            <h4 className="text-xs uppercase tracking-wider mb-3 text-gray-500">
                                                Features
                                            </h4>

                                            <ul className="space-y-2 text-sm text-[#020B2D]">
                                                {plan.features.map(
                                                    (
                                                        feature: {
                                                            featureKey: string;
                                                        },
                                                        index: number
                                                    ) => (
                                                        <li
                                                            key={index}
                                                            className="flex items-start gap-3"
                                                        >
                                                            <div className="mt-1.5 h-2 w-2 rounded-full bg-[#FF4B1F]" />

                                                            <span>
                                                                {feature.featureKey}
                                                            </span>
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        </>
                                    )}

                                    {/* Limits */}
                                    {plan.quotas?.length > 0 && (
                                        <div className="mt-5 pt-5 border-t border-gray-100">
                                            <h4 className="text-xs uppercase tracking-wider mb-3 text-gray-500">
                                                Limits
                                            </h4>

                                            <div className="space-y-2 text-sm">
                                                {plan.quotas.map(
                                                    (
                                                        quota: {
                                                            metricKey: string;
                                                            limitValue: number;
                                                        },
                                                        index: number
                                                    ) => (
                                                        <div
                                                            key={index}
                                                            className="flex justify-between"
                                                        >
                                                            <span className="text-gray-500">
                                                                {quota.metricKey.replaceAll(
                                                                    "_",
                                                                    " "
                                                                )}
                                                            </span>

                                                            <span className="font-semibold text-[#020B2D]">
                                                                {quota.limitValue}
                                                            </span>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Current Plan Details */}
                                    {isCurrentPlan && (
                                        <div className="mt-5 pt-5 border-t border-gray-100 space-y-2 text-sm">

                                        </div>
                                    )}

                                    <button
                                        disabled={isCurrentPlan}
                                        onClick={() => {
                                            if (isCurrentPlan) return;
                                            if (isCustomPlan) {
                                                setSalesRequestSubmitted(false);
                                                setSalesMessage("");
                                                setSalesPlan(plan);
                                            } else if (isDowngrade) setDowngradePlan(plan);
                                            else setCheckoutPlan(plan);
                                        }}
                                        className={`w-full mt-6 py-3 rounded-xl text-sm font-semibold transition
                    ${isCurrentPlan
                                                ? "border border-[#FF4B1F] text-[#FF4B1F] bg-[#FF4B1F]/5 cursor-not-allowed"
                                                : "bg-[#FF4B1F] hover:bg-[#ff5c35] text-white"
                                            }`}
                                    >
                                        {isCurrentPlan
                                            ? "Current Plan"
                                            : isCustomPlan ? "Contact Sales"
                                                : isDowngrade ? "Schedule Downgrade" : "Change Plan"}
                                    </button>
                                </div>
                            </div>
                        );
                    })}


                </div>
            )}
            {token && (
                <SubscriptionCheckoutModal
                    open={!!checkoutPlan}
                    plan={checkoutPlan}
                    role={category}
                    product={checkoutPlan?.productKey ?? selectedProduct}
                    token={token}
                    onClose={() => setCheckoutPlan(null)}
                    onComplete={() => getCurrentSubscription(token, category || undefined, checkoutPlan?.productKey ?? selectedProduct).then(response =>
                        setCurrentSubscription(response.data?.data?.[0] || null))}
                />
            )}
            <Dialog open={!!downgradePlan} onOpenChange={open => { if (!open && !mutating) setDowngradePlan(null); }}>
                <DialogContent className="max-w-lg rounded-3xl">
                    <DialogTitle className="text-2xl font-bold text-[#08184A]">Downgrade to {downgradePlan?.displayName}?</DialogTitle>
                    <p className="text-sm text-gray-500">The change will be scheduled for the end of your current billing period. Your existing features remain available until then.</p>
                    <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">At period end, SlickHood will ask you to authorize payment for the new plan before activating it.</div>
                    <div className="flex gap-3">
                        <button disabled={mutating} onClick={() => setDowngradePlan(null)} className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-600">Keep Current Plan</button>
                        <button disabled={mutating} onClick={async () => {
                            if (!token || !downgradePlan) return;
                            setMutating(true);
                            try {
                                await scheduleSubscriptionPlanChange(token, category, downgradePlan.productKey ?? selectedProduct, downgradePlan.code);
                                toast.success(`Downgrade to ${downgradePlan.displayName} scheduled.`);
                                setDowngradePlan(null);
                            } catch {
                                toast.error("Could not schedule the plan change.");
                            } finally {
                                setMutating(false);
                            }
                        }} className="flex-1 rounded-xl bg-[#FF4B1F] py-3 font-semibold text-white">Confirm Downgrade</button>
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={!!salesPlan} onOpenChange={open => {
                if (!open && !mutating) setSalesPlan(null);
            }}>
                <DialogContent className="max-w-lg rounded-3xl">
                    {salesRequestSubmitted ? (
                        <div className="space-y-5 py-4 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">✓</div>
                            <DialogTitle className="text-2xl font-bold text-[#08184A]">Request submitted</DialogTitle>
                            <p className="text-sm text-gray-500">Our subscription team has received your request for {salesPlan?.displayName}. They will contact you using your SlickHood account email.</p>
                            <button onClick={() => setSalesPlan(null)} className="w-full rounded-xl bg-[#FF4B1F] py-3 font-semibold text-white">Done</button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <DialogTitle className="text-2xl font-bold text-[#08184A]">Contact Sales</DialogTitle>
                            <p className="text-sm text-gray-500">Tell us what you need from the {salesPlan?.displayName} plan and our team will help tailor capacity, features, and billing.</p>
                            <label className="block text-sm font-semibold text-[#08184A]">
                                What should we know? <span className="font-normal text-gray-400">(optional)</span>
                                <textarea
                                    value={salesMessage}
                                    maxLength={1000}
                                    onChange={event => setSalesMessage(event.target.value)}
                                    placeholder="For example: number of properties, units, users, or integrations"
                                    className="mt-2 min-h-28 w-full resize-y rounded-xl border border-gray-200 p-3 font-normal outline-none focus:border-[#FF4B1F]"
                                />
                            </label>
                            <div className="flex gap-3">
                                <button disabled={mutating} onClick={() => setSalesPlan(null)} className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-600">Not Now</button>
                                <button disabled={mutating} onClick={async () => {
                                    if (!token || !salesPlan) return;
                                    setMutating(true);
                                    try {
                                        await requestSubscriptionSalesContact(token, salesPlan.code, salesMessage.trim());
                                        setSalesRequestSubmitted(true);
                                    } catch {
                                        toast.error("Could not submit the sales request. Please try again.");
                                    } finally {
                                        setMutating(false);
                                    }
                                }} className="flex-1 rounded-xl bg-[#FF4B1F] py-3 font-semibold text-white">{mutating ? "Submitting..." : "Submit Request"}</button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>


    );
}
