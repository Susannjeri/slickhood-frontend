"use client";

import { X } from "lucide-react";

interface ServiceCategory {
    id?: number;
    name: string;
    description: string;
    requiredDocumentTypes: string[];
}

interface ServiceCategoryViewModalProps {
    open: boolean;
    onClose: () => void;
    category: ServiceCategory | null;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    NATIONAL_ID: "National ID",
    PASSPORT: "Passport",
    BUSINESS_REGISTRATION: "Business Registration Certificate",
    TAX_CERTIFICATE: "Tax Certificate (PIN)",
    PROFESSIONAL_CERTIFICATE: "Professional Certificate",
    INSURANCE_CERTIFICATE: "Insurance Certificate",
    GOOD_CONDUCT: "Certificate of Good Conduct",
    WORK_PERMIT: "Work Permit",
    ACADEMIC_CERTIFICATE: "Academic Certificate",
    HEALTH_CERTIFICATE: "Health Certificate",
    OTHER: "Other",
};

export default function ServiceCategoryViewModal({
    open,
    onClose,
    category,
}: ServiceCategoryViewModalProps) {
    if (!open || !category) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-[#1A1740]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
                    <div>
                        <h2 className="text-lg font-semibold text-[#08184A] dark:text-white">
                            Service Category Details
                        </h2>
                        <p className="mt-0 text-xs text-gray-500 dark:text-white/60">
                            Viewing details for this category.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="space-y-5 px-6 py-5">
                    <div>
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                            Category Name
                        </p>
                        <p className="text-sm font-semibold text-[#020B2D] dark:text-white">
                            {category.name}
                        </p>
                    </div>

                    <div>
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                            Description
                        </p>
                        <p className="text-sm leading-6 text-gray-600 dark:text-white/70">
                            {category.description}
                        </p>
                    </div>

                    <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                            Required Documents
                        </p>

                        {category.requiredDocumentTypes?.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {category.requiredDocumentTypes.map((docType) => (
                                    <span
                                        key={docType}
                                        className="rounded-md bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-white/10 dark:text-white/80"
                                    >
                                        {DOCUMENT_TYPE_LABELS[docType] ?? docType}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">No documents required.</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t border-gray-200 px-6 py-4 dark:border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}