

"use client";

import React, { useState } from "react";

type VerificationTab = "documents" | "referees" | "services";

type ServiceProvider = {
    id: number;
    businessName: string;
    status: string;
};

interface ServiceProviderVerificationProps {
    provider: ServiceProvider;
}

const tabs: {
    id: VerificationTab;
    label: string;
    description: string;
}[] = [
    {
        id: "documents",
        label: "Documents",
        description: "Verify required provider documents",
    },
    {
        id: "referees",
        label: "Referees",
        description: "Verify submitted referee information",
    },
    {
        id: "services",
        label: "Services",
        description: "Review submitted services",
    },
];

export default function ServiceProviderVerification({
    provider,
}: ServiceProviderVerificationProps) {
    const [activeTab, setActiveTab] =
        useState<VerificationTab>("documents");

    const [documentsVerified, setDocumentsVerified] = useState(false);
    const [refereesVerified, setRefereesVerified] = useState(false);
    const [servicesReviewed, setServicesReviewed] = useState(false);

    const allVerified =
        documentsVerified &&
        refereesVerified &&
        servicesReviewed;

    const getTabStatus = (tab: VerificationTab) => {
        if (tab === "documents") {
            return documentsVerified;
        }

        if (tab === "referees") {
            return refereesVerified;
        }

        return servicesReviewed;
    };

    const handleNext = () => {
        if (activeTab === "documents") {
            setActiveTab("referees");
            return;
        }

        if (activeTab === "referees") {
            setActiveTab("services");
        }
    };

    const handleBack = () => {
        if (activeTab === "referees") {
            setActiveTab("documents");
            return;
        }

        if (activeTab === "services") {
            setActiveTab("referees");
        }
    };

    const handleApprove = () => {
        if (!allVerified) {
            return;
        }

        console.log("Approve service provider", provider.id);

        // TODO:
        // Connect this to the final admin approval API.
    };

    const handleReject = () => {
        console.log("Reject service provider", provider.id);

        // TODO:
        // Open rejection modal and connect to rejection API.
    };

    return (
        <div className="px-3 py-6">
            <div className="mx-auto w-full max-w-6xl">

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-xl font-semibold text-[#020B2D]">
                        Service Provider Verification
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        Review and verify the service provider before
                        approving their services.
                    </p>
                </div>

                {/* Provider information */}
                <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                Service Provider
                            </p>

                            <h2 className="mt-1 text-lg font-semibold text-[#020B2D]">
                                {provider.businessName}
                            </h2>

                            <p className="mt-1 text-xs text-gray-500">
                                Provider ID: {provider.id}
                            </p>
                        </div>

                        <span
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
                                provider.status === "APPROVED"
                                    ? "bg-green-50 text-green-700"
                                    : provider.status === "REJECTED"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-yellow-50 text-yellow-700"
                            }`}
                        >
                            {provider.status}
                        </span>
                    </div>
                </div>

                {/* Verification progress */}
                <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-[#020B2D]">
                            Verification Progress
                        </h3>

                        <p className="mt-1 text-xs text-gray-500">
                            Complete each verification area before approving
                            the service provider.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {tabs.map((tab, index) => {
                            const verified = getTabStatus(tab.id);
                            const active = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`rounded-lg border p-4 text-left transition ${
                                        active
                                            ? "border-[#FF4B1F] bg-orange-50"
                                            : "border-gray-200 hover:bg-gray-50"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                                                    verified
                                                        ? "bg-green-100 text-green-700"
                                                        : active
                                                        ? "bg-[#FF4B1F] text-white"
                                                        : "bg-gray-100 text-gray-500"
                                                }`}
                                            >
                                                {verified
                                                    ? "✓"
                                                    : index + 1}
                                            </span>

                                            <span className="text-sm font-medium text-[#020B2D]">
                                                {tab.label}
                                            </span>
                                        </div>

                                        {verified && (
                                            <span className="text-xs font-medium text-green-600">
                                                Complete
                                            </span>
                                        )}
                                    </div>

                                    <p className="mt-2 pl-11 text-xs text-gray-500">
                                        {tab.description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Verification content */}
                <div className="rounded-lg border border-gray-200 bg-white shadow-sm">

                    {/* Tab navigation */}
                    <div className="border-b border-gray-200 px-5">
                        <div className="flex gap-6">
                            {tabs.map((tab) => {
                                const active = activeTab === tab.id;
                                const verified = getTabStatus(tab.id);

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`relative py-4 text-sm font-medium ${
                                            active
                                                ? "text-[#020B2D]"
                                                : "text-gray-400 hover:text-gray-600"
                                        }`}
                                    >
                                        {tab.label}

                                        {verified && (
                                            <span className="ml-2 text-green-600">
                                                ✓
                                            </span>
                                        )}

                                        {active && (
                                            <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#FF4B1F]" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="min-h-[350px] p-6">

                        {activeTab === "documents" && (
                            <VerificationPlaceholder
                                title="Verify Documents"
                                description="Review every required document submitted by this service provider."
                                onComplete={() =>
                                    setDocumentsVerified(true)
                                }
                            />
                        )}

                        {activeTab === "referees" && (
                            <VerificationPlaceholder
                                title="Verify Referees"
                                description="Review and verify the referees provided by this service provider."
                                onComplete={() =>
                                    setRefereesVerified(true)
                                }
                            />
                        )}

                        {activeTab === "services" && (
                            <VerificationPlaceholder
                                title="Review Services"
                                description="Review the services submitted by this service provider before approval."
                                onComplete={() =>
                                    setServicesReviewed(true)
                                }
                            />
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">

                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={activeTab === "documents"}
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-[#020B2D] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Back
                        </button>

                        <div className="flex items-center gap-3">

                            <button
                                type="button"
                                onClick={handleReject}
                                className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                            >
                                Reject
                            </button>

                            {activeTab !== "services" ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="rounded-md bg-[#08184A] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
                                >
                                    Next
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleApprove}
                                    disabled={!allVerified}
                                    className="rounded-md bg-[#FF4B1F] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Approve Provider
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


/**
 * Temporary component.
 *
 * We will replace this with the actual:
 *
 * - Documents verification component
 * - Referees verification component
 * - Services review component
 *
 * once we wire the corresponding APIs.
 */
function VerificationPlaceholder({
    title,
    description,
    onComplete,
}: {
    title: string;
    description: string;
    onComplete: () => void;
}) {
    return (
        <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
            <h3 className="text-base font-semibold text-[#020B2D]">
                {title}
            </h3>

            <p className="mt-2 max-w-md text-sm text-gray-500">
                {description}
            </p>

            <button
                type="button"
                onClick={onComplete}
                className="mt-6 rounded-md bg-[#08184A] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
                Mark as Verified
            </button>
        </div>
    );
} 