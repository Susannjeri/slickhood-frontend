"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getServiceDocumentTypes, createServiceCategory, updateServiceCategory } from "@/services/serviceProvider";

interface ServiceCategory {
    id?: number;
    name: string;
    description: string;
    requiredDocumentTypes: string[];
}

interface ServiceCategoryModalProps {
    open: boolean;
    onClose: () => void;
    category?: ServiceCategory | null;
    onSuccess: (newCategory: ServiceCategory) => void;
}

interface DocumentType {
    id: string;
    name: string;
}

export default function ServiceCategoryModal({ open, onClose, category, onSuccess,

}: ServiceCategoryModalProps) {
    const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [selectedDocuments, setSelectedDocuments] = useState<string[]>(
        category?.requiredDocumentTypes ?? []
    );

    const [name, setName] = useState(category?.name ?? "");
    const [description, setDescription] = useState(category?.description ?? "");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { token } = useAuthStore();
    const isEditMode = Boolean(category);

    const toggleDocument = (id: string) => {
        setSelectedDocuments((prev) =>
            prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
        );
    };

    useEffect(() => {
        if (!open || !token) return;
        const fetchDocumentTypes = async () => {
            try {
                setLoadingDocuments(true);
                const response = await getServiceDocumentTypes(token);
                setDocumentTypes(response.data.data ?? []);
            } catch (error) {
                console.error("Failed to fetch document types:", error);
            } finally {
                setLoadingDocuments(false);
            }
        };

        fetchDocumentTypes();
    }, [open, token]);

    // Reset form each time the modal opens for a (possibly different) category
    useEffect(() => {
        if (!open) return;
        setName(category?.name ?? "");
        setDescription(category?.description ?? "");
        setSelectedDocuments(category?.requiredDocumentTypes ?? []);
        setError(null);
    }, [open, category]);

    const handleSubmit = async () => {
        if (!token) return;

        if (!name.trim() || !description.trim() || selectedDocuments.length === 0) {
            setError("Please fill in all fields and select at least one document.");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            const payload = {
                name,
                description,
                requiredDocumentTypes: selectedDocuments,
                requiredNumberOfReferees: 0,
            };
            const response = isEditMode && category?.id
                ? await updateServiceCategory(token, category.id, payload)
                : await createServiceCategory(token, payload);

            onSuccess(response.data.data);
            onClose();
        } catch (err) {
            console.error("Failed to save service category:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-[#1A1740]">
                {/* Header — unchanged */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
                    <div>
                        <h2 className="text-lg font-semibold text-[#08184A] dark:text-white">
                            {isEditMode ? "Edit Service Category" : "Create Service Category"}
                        </h2>
                        <p className="mt-0 text-xs text-gray-500 dark:text-white/60">
                            {isEditMode
                                ? "Update the service category details."
                                : "Create a category for services offered by service providers."}
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

                {/* Form */}
                <div className="space-y-5 px-6 py-5">
                    {error && (
                        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                            {error}
                        </p>
                    )}

                    <div>
                        <label className="mb-2 block text-sm font-medium text-[#020B2D] dark:text-white">
                            Category Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Nanny Services"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-xs outline-none transition focus:border-[#08184A] focus:ring-1 focus:ring-[#08184A] dark:border-white/10 dark:bg-white/5 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-[#020B2D] dark:text-white">
                            Description <span className="text-red-500">*</span>
                        </label>

                        <textarea
                            rows={3}
                            maxLength={250}
                            placeholder="Describe this service category"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-xs outline-none transition focus:border-[#08184A] focus:ring-1 focus:ring-[#08184A] dark:border-white/10 dark:bg-white/5 dark:text-white"
                        />

                        <div className="mt-1 flex justify-end">
                            <span className="text-[11px] text-gray-400">
                                {description.length}/250
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-[#020B2D] dark:text-white">
                            Required Documents <span className="text-red-500">*</span>
                        </label>
                        <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-white/10">
                            {loadingDocuments ? (
                                <p className="text-sm text-gray-400">Loading document types...</p>
                            ) : (
                                documentTypes.map((doc) => (
                                    <label
                                        key={doc.id}
                                        className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1 hover:bg-gray-50 dark:hover:bg-white/5"
                                    >
                                        <input
                                            type="checkbox"
                                            value={doc.id}
                                            checked={selectedDocuments.includes(doc.id)}
                                            onChange={() => toggleDocument(doc.id)}
                                            className="h-4 w-4 rounded border-gray-300 accent-[#08184A]"
                                        />
                                        <span className="text-xs text-[#08184A] dark:text-white/80">
                                            {doc.name}
                                        </span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="rounded-lg bg-[#08184A] px-4 py-2 text-sm font-medium text-white hover:bg-[#08184A]/90 disabled:opacity-50"
                    >
                        {submitting
                            ? "Saving..."
                            : isEditMode
                                ? "Save Changes"
                                : "Create Category"}
                    </button>
                </div>
            </div>
        </div>
    );
}
