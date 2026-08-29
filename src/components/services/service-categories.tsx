"use client";

import React, { useEffect, useState } from "react";
import ServiceCategoryModal from "./service-category-modal";
import { useAuthStore } from "@/store/authStore";
import { deleteServiceCategory, getServiceCategories } from "@/services/serviceProvider";
import ServiceCategoryViewModal from "./service-category-view-modal";

interface ServiceCategory {
    id?: number;
    name: string;
    description: string;
    requiredDocumentTypes: string[];
}

const DESCRIPTION_TRUNCATE_LENGTH = 60;

function truncate(text: string, length: number) {
    if (!text || text.length <= length) return text;
    return `${text.slice(0, length).trimEnd()}…`;
}

export default function ServiceCategories() {

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const PAGE_SIZE = 10;

    const [viewingCategory, setViewingCategory] = useState<ServiceCategory | null>(null);
    const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);



    const token = useAuthStore((state) => state.token);


    const fetchCategories = async (targetPage = page) => {
        if (!token) return;

        try {
            setLoading(true);
            setError(null);

            const response = await getServiceCategories(token, {
                page: targetPage,
                size: PAGE_SIZE,
            });

            setCategories(response.data.data ?? []);
            setTotalPages(response.data.totalPages ?? 0);
            setTotalElements(response.data.totalElements ?? 0);
        } catch (error) {
            console.error("Failed to fetch service categories:", error);
            setError("Failed to load service categories.");
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchCategories(page);
    }, [token, page]);

    const handleCategoryCreated = () => {
        setPage(0);       // jump back to first page so the new category is visible
        fetchCategories(0);
    };

    const handleView = (category: ServiceCategory) => {
        setOpenMenuId(null);
        setViewingCategory(category);
    };

    const handleEdit = (category: ServiceCategory) => {
        setOpenMenuId(null);
        setEditingCategory(category);
        setIsCategoryModalOpen(true);
    };

    const handleDelete = async (category: ServiceCategory) => {
        setOpenMenuId(null);
        if (!token || !category.id || !window.confirm(`Remove “${category.name}” from active service categories? Existing service records will be preserved.`)) return;
        try {
            await deleteServiceCategory(token, category.id);
            await fetchCategories(page);
        } catch {
            setError("Failed to remove service category.");
        }
    };

    return (
        <div className="px-3 py-6">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-[#020B2D]">
                            Service Categories
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">
                            {totalElements} {totalElements === 1 ? "category" : "categories"}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }}
                        className="rounded-md bg-[#FF4B1F] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                        Create Category
                    </button>
                </div>

                {/* Table */}
                <div className="mt-6 overflow-x-auto">
                    {loading ? (
                        <p className="py-8 text-center text-sm text-gray-500">
                            Loading service categories...
                        </p>
                    ) : error ? (
                        <p className="py-8 text-center text-sm text-red-500">
                            {error}
                        </p>
                    ) : categories.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-500">
                            No service categories yet.
                        </p>
                    ) : (
                        <table className="min-w-[720px] w-full table-fixed border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="w-56 px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Name
                                    </th>
                                    <th className="w-64 px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Description
                                    </th>
                                    <th className="w-36 px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Documents
                                    </th>
                                    <th className="w-28 px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {categories.map((category) => (
                                    <tr
                                        key={category.id}
                                        className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                                    >
                                        <td className="px-3 py-3 align-top font-medium text-[#020B2D]">
                                            {category.name}
                                        </td>
                                        <td
                                            className="px-3 py-3 align-top text-xs leading-5 text-gray-500"
                                            title={
                                                category.description?.length >
                                                    DESCRIPTION_TRUNCATE_LENGTH
                                                    ? category.description
                                                    : undefined
                                            }
                                        >
                                            {truncate(
                                                category.description,
                                                DESCRIPTION_TRUNCATE_LENGTH
                                            )}
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <span className="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
                                                {category.requiredDocumentTypes?.length ?? 0}{" "}
                                                {category.requiredDocumentTypes?.length === 1
                                                    ? "document"
                                                    : "documents"}
                                            </span>
                                        </td>
                                        <td className="relative px-3 py-3 text-right align-top">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setOpenMenuId((prev) =>
                                                        prev === category.id
                                                            ? null
                                                            : category.id ?? null
                                                    )
                                                }
                                                className="font-bold text-gray-700 hover:text-[#4B5563]"
                                                aria-label={`Actions for ${category.name}`}
                                            >
                                                ⋮
                                            </button>

                                            {openMenuId === category.id && (
                                                <div className="absolute right-3 top-9 z-10 w-32 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleView(category)}
                                                        className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(category)}
                                                        className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(category)}
                                                        className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-gray-50"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination — separate from the table's loading/error/empty states */}
                {!loading && !error && categories.length > 0 && (
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-gray-500">
                            Page {page + 1} of {totalPages}
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                                disabled={page === 0}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-[#020B2D] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Previous
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPage(p)}
                                    className={`h-7 w-7 rounded-md text-xs font-medium ${p === page
                                        ? "bg-[#FF4B1F] text-white"
                                        : "text-[#020B2D] hover:bg-gray-100"
                                        }`}
                                >
                                    {p + 1}
                                </button>
                            ))}

                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                                disabled={page >= totalPages - 1}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-[#020B2D] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <ServiceCategoryModal
                open={isCategoryModalOpen}
                onClose={() => { setIsCategoryModalOpen(false); setEditingCategory(null); }}
                category={editingCategory}
                onSuccess={handleCategoryCreated}
            />

            <ServiceCategoryViewModal
                open={viewingCategory !== null}
                onClose={() => setViewingCategory(null)}
                category={viewingCategory}
            />
        </div>
    );

}
