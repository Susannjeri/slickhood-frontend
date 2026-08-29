"use client";

import { useEffect, useState } from "react";
import { UserPlus, Eye, X, Trash2, Ban, Check, ShieldX } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cancelVisitor, deleteVisitor, decideVisitor, getVisitors } from "@/services/visitors.service";
import type { Visitor } from "./types";
import { VisitorDetailsModal, VisitorRegisterModal } from "./visitordetails-modal";
import SuccessModal from "../common/successmodal";


const statusStyles: Record<string, string> = {
    PENDING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    CHECKED_IN: "bg-green-50 text-green-700 border border-green-200",
    CHECKED_OUT: "bg-gray-100 text-gray-600 border border-gray-200",
    CANCELLED: "bg-red-50 text-red-700 border border-red-200",
};

function formatDateTime(iso: string) {
    if (!iso) return "-";
    const date = new Date(iso);
    return date.toLocaleString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function Visitors() {

    const { token } = useAuthStore();
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [phoneSearch, setPhoneSearch] = useState("");
    const [debouncedPhone, setDebouncedPhone] = useState("");

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<"cancel" | "delete" | null>(null);
    const [visitorToAction, setVisitorToAction] = useState<Visitor | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Debounce phone search input
    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedPhone(phoneSearch);
        }, 400);
        return () => clearTimeout(timeout);
    }, [phoneSearch]);

    const fetchVisitors = async () => {
        if (!token) return;
        setLoading(true);
        setError(null);

        try {
            const res = await getVisitors(token, {
                phone: debouncedPhone || undefined,
            });
            setVisitors(res.data?.data ?? res.data ?? []);
        } catch (err) {
            console.error(err);
            setError("Failed to load visitors. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVisitors();
    }, [token, debouncedPhone]);


    

    const openConfirmModal = (
        visitor: Visitor,
        action: "cancel" | "delete"
    ) => {
        setVisitorToAction(visitor);
        setConfirmAction(action);
        setShowConfirmModal(true);
    };

    const closeConfirmModal = () => {
        if (isProcessing) return;

        setShowConfirmModal(false);
        setConfirmAction(null);
        setVisitorToAction(null);
    };

    const handleCancel = async () => {
        if (!token || !visitorToAction) return;

        // A checked-out visitor cannot be cancelled
        if (visitorToAction.status === "CHECKED_OUT") {
            closeConfirmModal();
            return;
        }

        setIsProcessing(true);

        try {
            await cancelVisitor(visitorToAction.id, token);

            const response = await getVisitors(token);
            setVisitors(response.data.data || []);

            closeConfirmModal();
        } catch (error) {
            console.error("Cancel failed:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!token || !visitorToAction) return;

        setIsProcessing(true);

        try {
            await deleteVisitor(visitorToAction.id, token);

            const response = await getVisitors(token);
            setVisitors(response.data.data || []);

            if (selectedVisitor?.id === visitorToAction.id) {
                setSelectedVisitor(null);
            }

            closeConfirmModal();
        } catch (error) {
            console.error("Delete failed:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDecision = async (visitor: Visitor, decision: "APPROVE" | "DENY") => {
        if (!token) return;
        try {
            const response = await decideVisitor(visitor.id, decision, token);
            const accessCode = response.data?.data?.accessCode;
            setSuccessMessage(accessCode ? `Visit approved. Access code: ${accessCode}` : `Visit ${decision === "APPROVE" ? "approved" : "denied"}.`);
            await fetchVisitors();
        } catch { setError("The visit decision could not be saved."); }
    };



    return (
        <div className="space-y-4 px-2 py-5">

            {/* Visitors Table */}
            <div className="rounded-2xl border border-[#020B2D]/10 bg-white shadow-sm overflow-hidden">

                {/* Table Header */}
                <div className="flex items-center justify-between px-6 py-6 border-b border-gray-100">
                    <div className="flex items-center gap-6">
                        <div>
                            <h2 className="text-lg font-semibold text-[#020B2D]">Visitor List</h2>
                            <p className="text-sm text-gray-500 mt-1">All registered visitors.</p>
                        </div>

                        <input
                            type="text"
                            placeholder="Search by phone number"
                            value={phoneSearch}
                            onChange={(e) => setPhoneSearch(e.target.value)}
                            className="rounded-xl border border-[#020B2D]/15 px-3 py-2.5 text-sm w-64 focus:outline-none focus:border-[#08184A]"
                        />
                    </div>

                    <button
                        onClick={() => setShowRegisterModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#FF4B1F] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#ff5c35]"
                    >
                        <UserPlus className="h-4 w-4" />
                        Register Visitor
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="text-[#08184A] font-bold">
                                <th className="px-6 py-4 text-xs text-left font-semibold uppercase tracking-wider ">
                                    Visitor
                                </th>

                                <th className="px-6 py-4 text-xs text-left font-semibold uppercase tracking-wider ">
                                    Category
                                </th>

                                <th className="px-6 py-4 text-xs text-left font-semibold uppercase tracking-wider ">
                                    Vehicle
                                </th>

                                <th className="px-6 py-4 text-xs text-left font-semibold uppercase tracking-wider ">
                                    Unit
                                </th>

                                <th className="px-6 py-4 text-xs text-left font-semibold uppercase tracking-wider ">
                                    Property
                                </th>

                                <th className="px-6 py-4 text-xs text-left font-semibold uppercase tracking-wider ">
                                    Expected Arrival
                                </th>

                                <th className="px-6 py-4 text-xs text-left font-semibold uppercase tracking-wider ">
                                    Status
                                </th>

                                <th className="px-6 py-4 text-xs text-left font-semibold uppercase tracking-wider ">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-gray-500">
                                        Loading visitors...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-red-500">
                                        {error}
                                    </td>
                                </tr>
                            ) : visitors.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-gray-500">
                                        No visitors found.
                                    </td>
                                </tr>
                            ) : (
                                visitors.map((visitor, idx) => (
                                    <tr key={`${visitor.unitId}-${idx}`} className="border-t border-gray-100">
                                        <td className="px-6 py-4 text-sm">
                                            {visitor.visitorName}
                                        </td>

                                        <td className="px-6 py-4 text-sm ">
                                            {(visitor.visitType || visitor.visitorCategory).replaceAll("_", " ")}
                                        </td>

                                        <td className="px-6 py-4 text-sm ">
                                            {visitor.vehiclePlate || "-"}
                                        </td>

                                        <td className="px-6 py-4 text-sm ">
                                            {visitor.unitRef}
                                        </td>

                                        <td className="px-6 py-4 text-sm ">
                                            {visitor.propertyName}
                                        </td>

                                        <td className="px-6 py-4 text-sm ">
                                            {formatDateTime(visitor.expectedArrivalTime)}
                                        </td>

                                        <td className="px-6 py-4 text-sm">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[visitor.status] ??
                                                    "bg-gray-50 text-gray-600 border border-gray-200"
                                                    }`}
                                            >
                                                {visitor.status}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">

                                                {/* View */}
                                                <button
                                                    onClick={() => setSelectedVisitor(visitor)}
                                                    className="inline-flex items-center gap-2 rounded-lg border border-[#020B2D]/15 bg-white px-3 py-2 text-xs font-medium text-[#020B2D] transition-all duration-200 hover:border-[#020B2D] hover:bg-[#020B2D]/5 hover:shadow-sm"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    View
                                                </button>

                                                {visitor.status === "PENDING_APPROVAL" && <>
                                                    <button onClick={() => handleDecision(visitor, "APPROVE")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"><Check className="h-4 w-4"/>Approve</button>
                                                    <button onClick={() => handleDecision(visitor, "DENY")} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700"><ShieldX className="h-4 w-4"/>Deny</button>
                                                </>}
                                                
                                                {/* Cancel */}
                                                <button
                                                    onClick={() => openConfirmModal(visitor, "cancel")}
                                                    disabled={visitor.status === "CHECKED_OUT"}
                                                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 ${visitor.status === "CHECKED_OUT"
                                                            ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                                                            : "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 hover:shadow-sm"
                                                        }`}
                                                >
                                                    <Ban className="h-4 w-4" />
                                                    Cancel
                                                </button>

                                                {/* Delete */}
                                                <button
                                                    onClick={() => openConfirmModal(visitor, "delete")}
                                                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition-all duration-200 hover:border-red-300 hover:bg-red-100 hover:shadow-sm"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete
                                                </button>

                                            </div>
                                        </td>

                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

            {/* View Details Modal */}
            {selectedVisitor && (
                <VisitorDetailsModal
                    visitor={selectedVisitor}
                    onClose={() => setSelectedVisitor(null)}
                />
            )}

            {/* Register Visitor Modal */}
            {showRegisterModal && (
                <VisitorRegisterModal
                    onClose={() => setShowRegisterModal(false)}
                    onRegistered={(description) => {
                        setShowRegisterModal(false);
                        setSuccessMessage(description);
                        fetchVisitors();
                    }}
                />
            )}

            <SuccessModal
                open={!!successMessage}
                title="Success"
                message={successMessage ?? ""}
                onClose={() => setSuccessMessage(null)}
            />

            {showConfirmModal && visitorToAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div
                        className="w-full max-w-md rounded-xl bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="border-b border-gray-100 px-6 py-5">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full ${confirmAction === "delete"
                                        ? "bg-red-100"
                                        : "bg-amber-100"
                                        }`}
                                >
                                    {confirmAction === "delete" ? (
                                        <Trash2 className="h-5 w-5 text-red-600" />
                                    ) : (
                                        <Ban className="h-5 w-5 text-amber-600" />
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {confirmAction === "delete"
                                            ? "Delete Visitor"
                                            : "Cancel Visit"}
                                    </h3>

                                    <p className="text-sm text-gray-500">
                                        Please confirm this action
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5">
                            <p className="text-sm leading-6 text-gray-600">
                                {confirmAction === "delete" ? (
                                    <>
                                        Are you sure you want to delete{" "}
                                        <span className="font-semibold text-gray-900">
                                            {visitorToAction.visitorName}
                                        </span>
                                        ? This action cannot be undone.
                                    </>
                                ) : (
                                    <>
                                        Are you sure you want to cancel the visit for{" "}
                                        <span className="font-semibold text-gray-900">
                                            {visitorToAction.visitorName}
                                        </span>
                                        ?
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                            <button
                                type="button"
                                onClick={closeConfirmModal}
                                disabled={isProcessing}
                                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                No, Keep It
                            </button>

                            <button
                                type="button"
                                onClick={
                                    confirmAction === "delete"
                                        ? handleDelete
                                        : handleCancel
                                }
                                disabled={isProcessing}
                                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmAction === "delete"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-amber-600 hover:bg-amber-700"
                                    }`}
                            >
                                {isProcessing
                                    ? "Processing..."
                                    : confirmAction === "delete"
                                        ? "Yes, Delete"
                                        : "Yes, Cancel"}
                            </button>
                        </div>
                    </div>
                </div>
            )}




        </div>



    );
}
