"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import {
    getServiceCategories,
    getServiceProviderServices,
} from "@/services/serviceProvider";
import AddServiceModal from "./add-service-modal";
import ConfirmDeleteServiceModal from "./confirmdeleteservicemodal";

interface ServiceCategory {
    id: number;
    name: string;
    description: string;
    requiredDocumentTypes: string[];
    requiredNumberOfReferees?: number;
}

interface ProviderService {
    id: number;
    profileId: number;
    categoryId: number;
    categoryName: string;
    tier: string | null;
    amount: number;
    currency: string;
    pricingUnit: string;
    status:
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "LISTED"
    | "SUSPENDED"
    | "REMOVED";
    riskLabel: "UNDER_REVIEW" | "VERIFIED" | "TRUSTED";
    createdOn: string;
}

type StatusFilter = "ALL" | ProviderService["status"];

const STATUS_META: Record<
    ProviderService["status"],
    { label: string; dot: string; badge: string }
> = {
    DRAFT: {
        label: "Draft",
        dot: "bg-gray-400",
        badge: "bg-gray-100 text-gray-600",
    },
    SUBMITTED: {
        label: "Submitted",
        dot: "bg-blue-500",
        badge: "bg-blue-50 text-blue-700",
    },
    UNDER_REVIEW: {
        label: "Under Review",
        dot: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700",
    },
    LISTED: {
        label: "Listed",
        dot: "bg-green-500",
        badge: "bg-green-50 text-green-700",
    },
    SUSPENDED: {
        label: "Suspended",
        dot: "bg-red-500",
        badge: "bg-red-50 text-red-700",
    },
    REMOVED: {
        label: "Removed",
        dot: "bg-gray-300",
        badge: "bg-gray-50 text-gray-400",
    },
};

const RISK_BADGE: Record<ProviderService["riskLabel"], string> = {
    UNDER_REVIEW: "text-gray-400",
    VERIFIED: "text-blue-600",
    TRUSTED: "text-green-600",
};

const PAGE_SIZE_OPTIONS = [5, 10, 25];

function formatPricingUnit(unit: string) {
    return unit
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ServiceProvider() {
    const { token } = useAuthStore();

    const [services, setServices] = useState<ProviderService[]>([]);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showAddService, setShowAddService] = useState(false);
    const [resumeDraft, setResumeDraft] = useState<{
        service: ProviderService;
        category: ServiceCategory;
    } | null>(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(5);
    const [deleteTarget, setDeleteTarget] = useState<ProviderService | null>(null);

    // Categories the user already has a service for (any status)
    const takenCategoryIds = useMemo(
        () => new Set(services.map((s) => s.categoryId)),
        [services]
    );

    const fetchServices = async () => {
        if (!token) return;

        try {
            setLoading(true);
            setError(null);

            // Fetch a wide page once; filtering/pagination below happens
            // client-side since the list endpoint has no status query param.
            const response = await getServiceProviderServices(token, {
                page: 0,
                size: 100,
                sort: "createdOn,desc",
            });

            setServices(response.data.data ?? []);
        } catch (err) {
            console.error("Failed to fetch services:", err);
            setError("We couldn't load your services. Try refreshing the page.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchCategories = async () => {
            if (!token) return;

            try {
                const response = await getServiceCategories(token);
                setCategories(response.data.data ?? []);
            } catch (err) {
                console.error("Failed to fetch service categories:", err);
            }
        };

        fetchCategories();
    }, [token]);

    useEffect(() => {
        fetchServices();
    }, [token]);

    // Reset to page 1 whenever the active view changes underneath the user
    useEffect(() => {
        setPage(0);
    }, [search, statusFilter, pageSize]);

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { ALL: services.length };
        for (const s of services) {
            counts[s.status] = (counts[s.status] ?? 0) + 1;
        }
        return counts;
    }, [services]);

    const draftCount = statusCounts["DRAFT"] ?? 0;

    const handleResumeDraft = (service: ProviderService) => {
        const category = categories.find((c) => c.id === service.categoryId);

        if (!category) {
            // category list hasn't loaded yet or category was since removed —
            // fail loud rather than silently opening a broken modal
            setError("Couldn't load the category for this draft. Try refreshing.");
            return;
        }

        setResumeDraft({ service, category });
    };

    const filteredServices = useMemo(() => {
        const query = search.trim().toLowerCase();

        return services.filter((service) => {
            const matchesStatus =
                statusFilter === "ALL" || service.status === statusFilter;
            const matchesSearch =
                !query || service.categoryName.toLowerCase().includes(query);

            return matchesStatus && matchesSearch;
        });
    }, [services, search, statusFilter]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredServices.length / pageSize)
    );

    const pagedServices = filteredServices.slice(
        page * pageSize,
        page * pageSize + pageSize
    );

    const STATUS_TABS: { key: StatusFilter; label: string }[] = [
        { key: "ALL", label: "All" },
        { key: "DRAFT", label: "Draft" },
        { key: "SUBMITTED", label: "Submitted" },
        { key: "UNDER_REVIEW", label: "Under Review" },
        { key: "LISTED", label: "Listed" },
        { key: "SUSPENDED", label: "Suspended" },
    ];

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-9 w-full max-w-md rounded-lg bg-gray-100" />
                    <div className="h-64 w-full rounded-xl bg-gray-100" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                    <p className="text-sm font-medium text-red-700">{error}</p>
                    <button
                        onClick={fetchServices}
                        className="mt-3 text-xs font-semibold text-red-700 underline"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-sm font-semibold text-[#020B2D]">My Services</h1>
                    <p className="text-xs text-[#020B2D]/50">
                        {services.length} {services.length === 1 ? "service" : "services"}{" "}
                        total
                        {draftCount > 0 && (
                            <span className="ml-2 font-medium text-amber-600">
                                · {draftCount} unfinished{" "}
                                {draftCount === 1 ? "draft" : "drafts"}
                            </span>
                        )}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowAddService(true)}
                    className="rounded-md bg-[#FF4B1F] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                    + Add Service
                </button>
            </div>

            {/* Status tabs */}
            <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl bg-[#020B2D]/[0.04] p-1.5">
                {STATUS_TABS.map((tab) => {
                    const isActive = statusFilter === tab.key;
                    const count = statusCounts[tab.key] ?? 0;

                    return (
                        <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${isActive
                                ? "bg-[#FF4B1F] text-white shadow-sm shadow-[#FF4B1F]/30"
                                : "text-[#020B2D]/60 hover:bg-white hover:text-[#020B2D]"
                                }`}
                        >
                            {tab.label}
                            <span
                                className={`rounded-full px-1.5 text-[10px] ${isActive
                                    ? "bg-white/20 text-white"
                                    : "bg-[#020B2D]/10 text-[#020B2D]/50"
                                    }`}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mb-5 relative max-w-xs">
                <svg
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#020B2D]/40"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-5.2-5.2m1.7-5.3a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by category name..."
                    className="h-9 w-full rounded-lg border border-[#020B2D]/20 bg-white pl-8 pr-3 text-xs text-[#020B2D] outline-none transition focus:border-[#FF4B1F] focus:ring-2 focus:ring-[#FF4B1F]/10"
                />
            </div>

            {/* Table */}
            {filteredServices.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-10 text-center">
                    <p className="text-sm font-medium text-[#020B2D]">
                        {services.length === 0
                            ? "No services yet"
                            : "No services match this filter"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        {services.length === 0
                            ? "Add a service to start accepting bookings."
                            : "Try a different status or search term."}
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-[760px] w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 uppercase tracking-wider text-[#020B2D]">
                                    <th className="px-5 py-3.5 font-semibold">Service</th>
                                    <th className="px-5 py-3.5 font-semibold">Amount</th>
                                    <th className="px-5 py-3.5 font-semibold">Currency</th>
                                    <th className="px-5 py-3.5 font-semibold">Pricing Unit</th>
                                    <th className="px-5 py-3.5 font-semibold">Status</th>
                                    <th className="px-5 py-3.5 font-semibold">Risk</th>
                                    <th className="px-5 py-3.5 font-semibold">Added</th>
                                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {pagedServices.map((service) => {
                                    const meta = STATUS_META[service.status];

                                    return (
                                        <tr
                                            key={service.id}
                                            className="group relative transition hover:bg-orange-50/40"
                                        >
                                            <td className="relative px-5 py-4">
                                                <span
                                                    className={`absolute left-0 top-0 h-full w-1 ${meta.dot} opacity-70 transition group-hover:opacity-100`}
                                                />
                                                <p className="font-semibold text-[#020B2D]">
                                                    {service.categoryName}
                                                </p>
                                                {service.tier && (
                                                    <p className="mt-0.5 inline-flex items-center gap-1 font-medium text-[#FF4B1F]">
                                                        ★ {service.tier}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 font-semibold text-[#020B2D]">
                                                {service.amount.toFixed(2)}
                                            </td>
                                            <td className="px-5 py-4 text-[#020B2D]/70">
                                                {service.currency}
                                            </td>
                                            <td className="px-5 py-4 text-[#020B2D]/70">
                                                {formatPricingUnit(service.pricingUnit)}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${meta.badge}`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
                                                    />
                                                    {meta.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`font-semibold ${RISK_BADGE[service.riskLabel]}`}
                                                >
                                                    {formatPricingUnit(service.riskLabel)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-[#020B2D]/50">
                                                {new Date(service.createdOn).toLocaleDateString(
                                                    "en-KE",
                                                    {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                    }
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {service.status === "DRAFT" && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleResumeDraft(service)}
                                                            className="rounded-md border border-[#FF4B1F]/30 px-2.5 py-1 text-[11px] font-semibold text-[#FF4B1F] transition hover:bg-[#FF4B1F]/5"
                                                        >
                                                            Resume →
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteTarget(service)}
                                                            className="text-xs font-medium text-red-600 hover:underline"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60 px-5 py-3.5 text-xs">
                        <div className="flex items-center gap-2 text-[#020B2D]/50">
                            <span>
                                Showing {page * pageSize + 1}–
                                {Math.min((page + 1) * pageSize, filteredServices.length)} of{" "}
                                {filteredServices.length}
                            </span>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className="rounded-md border border-gray-200 bg-white px-1.5 py-1 text-xs outline-none"
                            >
                                {PAGE_SIZE_OPTIONS.map((size) => (
                                    <option key={size} value={size}>
                                        {size} / page
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="rounded-md border border-gray-200 px-2.5 py-1 font-medium text-[#020B2D] transition hover:border-[#FF4B1F] hover:text-[#FF4B1F] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-[#020B2D]"
                            >
                                ← Prev
                            </button>
                            <span className="px-2 text-[#020B2D]/50">
                                Page {page + 1} of {totalPages}
                            </span>
                            <button
                                onClick={() =>
                                    setPage((p) => Math.min(totalPages - 1, p + 1))
                                }
                                disabled={page >= totalPages - 1}
                                className="rounded-md border border-gray-200 px-2.5 py-1 font-medium text-[#020B2D] transition hover:border-[#FF4B1F] hover:text-[#FF4B1F] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-[#020B2D]"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {(showAddService || resumeDraft) && (
                <AddServiceModal
                    categories={categories}
                    existingServices={services}
                    takenCategoryIds={takenCategoryIds}
                    initialDraft={resumeDraft ?? undefined}
                    onClose={() => {
                        setShowAddService(false);
                        setResumeDraft(null);
                        fetchServices(); // refresh list after adding or resuming a service
                    }}
                />
            )}

            {deleteTarget && (
                <ConfirmDeleteServiceModal
                    serviceId={deleteTarget.id}
                    categoryName={deleteTarget.categoryName}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={(id) =>
                        setServices((prev) => prev.filter((s) => s.id !== id))
                    }
                />
            )}
        </div>
    );
}
