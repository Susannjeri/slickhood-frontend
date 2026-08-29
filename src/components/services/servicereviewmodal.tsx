"use client";

import { useEffect, useState } from "react";
import { X, Check, AlertTriangle, MapPin, User, Tag, Calendar, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
    getServiceDetails,
    approveService,
    rejectService,
    getServiceCategories
} from "@/services/serviceProvider";
import { PendingService } from "@/types/service";

interface ServiceCategory {
    id: number;
    name: string;
    description?: string;
}

interface ReviewModalProps {
    service: PendingService | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ServiceReviewModal({ service, onClose, onSuccess }: ReviewModalProps) {
    
    const { token } = useAuthStore();
    const [details, setDetails] = useState<any>(null);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [rejectionReason, setRejectionReason] = useState<string>("");
    const [showRejectInput, setShowRejectInput] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch Service Categories to match categoryId -> name
    useEffect(() => {
        if (!token) return;

        const fetchCategories = async () => {
            try {
                const res = await getServiceCategories(token);
                const categoriesList = res.data?.data?.content || res.data?.data || [];
                setCategories(categoriesList);
            } catch (err) {
                console.error("Failed to fetch service categories:", err);
            }
        };

        fetchCategories();
    }, [token]);

    // Fetch Service Details
    useEffect(() => {
        if (!service || !token) return;

        const fetchDetails = async () => {
            try {
                setLoading(true);
                const res = await getServiceDetails(token, service.id);
                setDetails(res.data?.data || service);
            } catch (err) {
                setDetails(service);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [service, token]);

    useEffect(() => {
        if (!service) return;
        setShowRejectInput(false);
        setRejectionReason("");
        setError(null);
    }, [service]);

    if (!service) return null;

    // Resolve category name from state map
    const matchedCategory = categories.find((cat) => cat.id === service.categoryId);
    const categoryDisplayName = matchedCategory?.name || service.categoryName || `Category #${service.categoryId}`;

    const handleApprove = async () => {
        if (!token) return;
        try {
            setSubmitting(true);
            setError(null);
            await approveService(token, service.id);
            onSuccess();
            onClose();
        } catch (err) {
            setError("Failed to approve service. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!token) return;
        if (!rejectionReason.trim()) {
            setError("Please specify a reason for rejection.");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            await rejectService(token, service.id, rejectionReason);
            onSuccess();
            onClose();
        } catch (err) {
            setError("Failed to reject service. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-[#1A1740]">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
                    <div>
                        <h2 className="text-lg font-semibold text-[#08184A] dark:text-white">
                            Review Pending Service
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-white/60">
                            Service ID: #{service.id}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="max-h-[70vh] overflow-y-auto space-y-4 px-6 py-5">
                    {error && (
                        <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                            {error}
                        </p>
                    )}

                    {loading ? (
                        <p className="py-8 text-center text-xs text-gray-400 dark:text-white/50">
                            Loading service details...
                        </p>
                    ) : (
                        <>
                            {/* Summary Cards Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 dark:border-white/10 dark:bg-white/5">
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-white/60">
                                        <User className="h-3.5 w-3.5 text-[#08184A] dark:text-white/80" /> Provider
                                    </span>
                                    <p className="mt-1 truncate text-xs font-semibold text-[#020B2D] dark:text-white">
                                        {details?.serviceProviderName || service.serviceProviderName}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-gray-400 dark:text-white/40">
                                        Profile ID: {service.profileId}
                                    </p>
                                </div>

                                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 dark:border-white/10 dark:bg-white/5">
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-white/60">
                                        <Tag className="h-3.5 w-3.5 text-[#08184A] dark:text-white/80" /> Service Category
                                    </span>
                                    {/* Category Name displayed in bold dark blue (#08184A) / white in dark mode */}
                                    <p className="mt-1 truncate text-xs font-bold text-[#08184A] dark:text-white">
                                        {categoryDisplayName}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-gray-400 dark:text-white/40">
                                        Category ID: {service.categoryId}
                                    </p>
                                </div>
                            </div>

                            {/* Detailed Key-Value Specs */}
                            <div className="space-y-2.5 rounded-lg border border-gray-200 p-3.5 text-xs dark:border-white/10">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-white/10">
                                    <span className="text-gray-500 dark:text-white/60">Pricing Rate</span>
                                    <span className="font-semibold text-[#08184A] dark:text-white">
                                        {service.currency} {service.amount.toFixed(2)} / {service.pricingUnit.replace("_", " ").toLowerCase()}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-white/10">
                                    <span className="flex items-center gap-1.5 text-gray-500 dark:text-white/60">
                                        <Calendar className="h-3.5 w-3.5" /> Submitted Date
                                    </span>
                                    <span className="text-gray-700 dark:text-white/80">
                                        {new Date(service.createdOn).toLocaleString()}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-white/10">
                                    <span className="flex items-center gap-1.5 text-gray-500 dark:text-white/60">
                                        <MapPin className="h-3.5 w-3.5" /> Coordinates
                                    </span>
                                    <span className="font-mono text-gray-700 dark:text-white/80">
                                        {service.latitude}, {service.longitude}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between pt-0.5">
                                    <span className="flex items-center gap-1.5 text-gray-500 dark:text-white/60">
                                        <ShieldAlert className="h-3.5 w-3.5" /> Risk Status
                                    </span>
                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                                        {service.riskLabel.replace("_", " ")}
                                    </span>
                                </div>
                            </div>

                            {/* Optional Rejection Reason Field */}
                            {showRejectInput && (
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-[#020B2D] dark:text-white">
                                        Reason for Rejection <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Specify why this service submission does not meet compliance guidelines..."
                                        className="w-full resize-none rounded-lg border border-gray-300 p-2.5 text-xs outline-none transition focus:border-[#08184A] focus:ring-1 focus:ring-[#08184A] dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white/30 dark:focus:ring-white/30"
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                    >
                        Cancel
                    </button>

                    {!showRejectInput ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setShowRejectInput(true)}
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                            >
                                <AlertTriangle className="h-4 w-4" /> Reject
                            </button>
                            <button
                                type="button"
                                onClick={handleApprove}
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4B1F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#FF4B1F]/90 disabled:opacity-50"
                            >
                                <Check className="h-4 w-4" /> {submitting ? "Approving..." : "Approve Service"}
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={handleReject}
                            disabled={submitting}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                            {submitting ? "Rejecting..." : "Confirm Rejection"}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}