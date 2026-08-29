
"use client";

import { X } from "lucide-react";

interface ServiceCategory {
    id: number;
    name: string;
    description: string;
    requiredDocumentTypes: string[];
    requiredNumberOfReferees: number;
}

interface ServiceCategoryDetailsModalProps {
    category: ServiceCategory;
    profileExists: boolean;
    onClose: () => void;
    onSetUpProfile: () => void;
}

export default function ServiceCategoryDetailsModal({
    category,
    profileExists,
    onClose,
    onSetUpProfile,
}: ServiceCategoryDetailsModalProps) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="border-b border-gray-100 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#FF4B1F]">
                                Service Category
                            </p>

                            <h2 className="mt-1 text-xl font-semibold text-[#020B2D]">
                                {category.name}
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                            aria-label="Close modal"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <div className="max-h-[70vh] overflow-y-auto px-6 py-5">

                    {/* DESCRIPTION */}
                    <div>
                        <h3 className="text-sm font-semibold text-[#020B2D]">
                            About this category
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                            {category.description}
                        </p>
                    </div>

                    {/* REQUIREMENTS */}
                    <div className="mt-6">
                        <h3 className="text-sm font-semibold text-[#020B2D]">
                            Requirements
                        </h3>

                        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4">

                            {/* DOCUMENT COUNT */}
                            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                                <span className="text-xs text-gray-500">
                                    Required documents
                                </span>

                                <span className="text-xs font-semibold text-[#020B2D]">
                                    {category.requiredDocumentTypes.length}
                                </span>
                            </div>

                            {/* DOCUMENTS */}
                            <div className="mt-4 flex flex-wrap gap-2">
                                {category.requiredDocumentTypes.map(
                                    (documentType) => (
                                        <span
                                            key={documentType}
                                            className="rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-600"
                                        >
                                            {documentType
                                                .replaceAll("_", " ")
                                                .toLowerCase()
                                                .replace(/\b\w/g, (char) =>
                                                    char.toUpperCase()
                                                )}
                                        </span>
                                    )
                                )}
                            </div>

                            {/* REFEREES */}
                            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3">
                                <span className="text-xs text-gray-500">
                                    Required referees
                                </span>

                                <span className="text-xs font-semibold text-[#020B2D]">
                                    {category.requiredNumberOfReferees}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* PROFILE CTA */}
                    {!profileExists && (
                        <div className="mt-6 rounded-xl border border-[#FF4B1F]/10 bg-[#FF4B1F]/5 p-4">
                            <p className="text-sm font-semibold text-[#020B2D]">
                                Interested in offering this service?
                            </p>

                            <p className="mt-1 text-xs leading-5 text-gray-500">
                                Set up your service provider profile to start
                                offering services in this category.
                            </p>

                            <button
                                type="button"
                                onClick={onSetUpProfile}
                                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#FF4B1F] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                            >
                                Set Up Profile
                                <span>→</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

