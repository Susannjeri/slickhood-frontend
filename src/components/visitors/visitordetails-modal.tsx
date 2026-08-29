"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Visitor } from "./types";
import { useAuthStore } from "@/store/authStore";
import {
    getTenantUnits,
    registerVisitor,
    type TenantUnit,
    type RegisterVisitorPayload,
} from "@/services/visitors.service";


export const statusStyles: Record<string, string> = {
    PENDING_APPROVAL: "bg-amber-50 text-amber-700 border border-amber-200",
    APPROVED: "bg-blue-50 text-blue-700 border border-blue-200",
    DENIED: "bg-red-50 text-red-700 border border-red-200",
    PENDING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    CHECKED_IN: "bg-green-50 text-green-700 border border-green-200",
    CHECKED_OUT: "bg-gray-100 text-gray-600 border border-gray-200",
    CANCELLED: "bg-red-50 text-red-700 border border-red-200",
};

export function formatDateTime(iso: string) {
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



function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm font-medium text-[#020B2D] text-right">{value}</span>
        </div>
    );
}

type ModalShellProps = {
    title: string;
    subtitle: string;
    onClose: () => void;
    children: React.ReactNode;
    footer: React.ReactNode;
};

function ModalShell({ title, subtitle, onClose, children, footer }: ModalShellProps) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-semibold text-[#020B2D]">{title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-6 py-2">{children}</div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                    {footer}
                </div>
            </div>
        </div>
    );
}

/* ---------------- View mode ---------------- */

export function VisitorDetailsModal({
    visitor,
    onClose,
}: {
    visitor: Visitor;
    onClose: () => void;
}) {
    return (
        <ModalShell
            title={visitor.visitorName}
            subtitle="Visitor details"
            onClose={onClose}
            footer={
                <button
                    onClick={onClose}
                    className="rounded-xl bg-[#020B2D] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#020B2D]/90"
                >
                    Close
                </button>
            }
        >
            <DetailRow
                label="Status"
                value={
                    <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[visitor.status] ??
                            "bg-gray-50 text-gray-600 border border-gray-200"
                            }`}
                    >
                        {visitor.status}
                    </span>
                }
            />
            <DetailRow label="Access type" value={(visitor.visitType || visitor.visitorCategory).replaceAll("_", " ")} />
            <DetailRow label="Purpose" value={visitor.purpose || "-"} />
            {visitor.visitType === "DELIVERY" && <DetailRow label="Courier / company" value={visitor.companyName || "-"} />}
            {visitor.visitType === "DELIVERY" && <DetailRow label="Tracking reference" value={visitor.trackingNumber || "-"} />}
            <DetailRow label="Vehicle Plate" value={visitor.vehiclePlate || "-"} />
            <DetailRow label="Parking Lot" value={visitor.parkingLot || "-"} />
            <DetailRow label="Chargeable" value={visitor.chargeable ? "Yes" : "No"} />
            <DetailRow label="Unit" value={visitor.unitRef} />
            <DetailRow label="Property" value={visitor.propertyName} />
            <DetailRow label="Expected Arrival" value={formatDateTime(visitor.expectedArrivalTime)} />
            {visitor.validUntil && <DetailRow label="Access expires" value={formatDateTime(visitor.validUntil)} />}
            <DetailRow label="Entries used" value={`${visitor.entryCount ?? 0} of ${visitor.maxEntries ?? 1}`} />
            {visitor.credentialHint && <DetailRow label="Access code" value={`••••••${visitor.credentialHint}`} />}
            <DetailRow label="Registered On" value={formatDateTime(visitor.createdOn)} />
        </ModalShell>
    );
}

/* ---------------- Register mode ---------------- */

const initialForm: RegisterVisitorPayload = {
    visitorName: "",
    vehiclePlate: "",
    expectedArrivalTime: "",
    parkingLot: "",
    chargeable: false,
    unitId: 0,
    visitorPhoneNumber: "",
    visitorCategory: "",
    visitType: "WALK_IN",
    purpose: "",
    companyName: "",
    trackingNumber: "",
    maxEntries: 1,
};

export function VisitorRegisterModal({
    onClose,
    onRegistered,
}: {
    onClose: () => void;
    onRegistered: (description: string) => void;
}) {
    const { token } = useAuthStore();

    const [units, setUnits] = useState<TenantUnit[] | null>(null);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [form, setForm] = useState<RegisterVisitorPayload>(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Lazy-load the resident's available units.
    useEffect(() => {
        if (!token) return;

        const loadOptions = async () => {
            setLoadingOptions(true);
            try {
                const unitsRes = await getTenantUnits(token);
                setUnits(unitsRes.data?.data ?? []);
            } catch (err) {
                console.error(err);
                setError("Failed to load form options. Please try again.");
            } finally {
                setLoadingOptions(false);
            }
        };

        loadOptions();
    }, [token]);

    const updateField = <K extends keyof RegisterVisitorPayload>(
        key: K,
        value: RegisterVisitorPayload[K]
    ) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const [validationErrors, setValidationErrors] = useState<
        Partial<Record<keyof RegisterVisitorPayload, string>>
    >({});

    const validateForm = () => {
        const errors: Partial<Record<keyof RegisterVisitorPayload, string>> = {};
        const phone = form.visitorPhoneNumber.trim();

        if (!form.visitorName.trim()) {
            errors.visitorName = "Visitor name is required.";
        }

        if (!form.visitorPhoneNumber.trim()) {
            errors.visitorPhoneNumber = "Phone number is required.";
        }

        if (form.visitType === "DRIVE_IN" && !form.vehiclePlate.trim()) {
            errors.vehiclePlate = "Vehicle plate is required for drive-in access.";
        }
        if (form.visitType === "DELIVERY" && !form.companyName?.trim()) {
            errors.companyName = "Courier or delivery company is required.";
        }

        if (!form.unitId) {
            errors.unitId = "Please select a unit.";
        }

        if (!form.expectedArrivalTime) {
            errors.expectedArrivalTime = "Expected arrival time is required.";
        }

        if (!phone) {
            errors.visitorPhoneNumber = "Phone number is required.";
        } else if (!/^07\d{8}$/.test(phone)) {
            errors.visitorPhoneNumber =
                "Enter a valid phone number, e.g. 0700000000.";
        }

        setValidationErrors(errors);

        return Object.keys(errors).length === 0;

        setValidationErrors(errors);

        return Object.keys(errors).length === 0;
    };

    function toApiDateTime(datetimeLocal: string): string {
        if (!datetimeLocal) return "";
        const [datePart, timePart] = datetimeLocal.split("T");
        const timeWithSeconds = timePart.length === 5 ? `${timePart}:00` : timePart;
        return `${datePart} ${timeWithSeconds}`;
    }



    const handleSubmit = async () => {
        if (!token) return;

        const isValid = validateForm();

        if (!isValid) {
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const payload: RegisterVisitorPayload = {
                ...form,
                expectedArrivalTime: toApiDateTime(form.expectedArrivalTime),
                visitorCategory: form.visitType === "DELIVERY" ? "DELIVERY" : "GUEST",
            };

            const res = await registerVisitor(payload, token);

            const accessCode = res.data?.data?.accessCode;
            const description = accessCode
                ? `Visitor registered. Access code: ${accessCode}`
                : (res.data?.description ?? "Visitor registered successfully.");

            onRegistered(description);
        } catch (err: any) {
            console.error(err);

            const apiMessage =
                err?.response?.data?.description ||
                err?.response?.data?.message ||
                "Failed to register visitor. Please check the details and try again.";

            setError(apiMessage);
        } finally {
            setSubmitting(false);
        }
    };



    return (
        <ModalShell
            title="Register Visitor"
            subtitle="Add a new expected visitor"
            onClose={onClose}
            footer={
                <>
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || loadingOptions}
                        className="rounded-xl bg-[#FF4B1F] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#ff5c35] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? "Registering..." : "Register"}
                    </button>
                </>
            }
        >
            {loadingOptions ? (
                <p className="py-8 text-center text-sm text-gray-500">Loading form...</p>
            ) : (
                <div className="space-y-4 py-2">
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    <div>
                        <label className="text-sm font-medium text-[#020B2D]">
                            Visitor Name <span className="text-red-500">*</span>
                        </label>

                        <input
                            type="text"
                            value={form.visitorName}
                            onChange={(e) => {
                                updateField("visitorName", e.target.value);
                                setValidationErrors((prev) => ({
                                    ...prev,
                                    visitorName: undefined,
                                }));
                            }}
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${validationErrors.visitorName
                                ? "border-red-300 focus:border-red-500"
                                : "border-gray-200"
                                }`}
                        />

                        {validationErrors.visitorName && (
                            <p className="mt-1 text-xs text-red-500">
                                {validationErrors.visitorName}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium text-[#020B2D]">
                            Phone Number <span className="text-red-500">*</span>
                        </label>

                        <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            value={form.visitorPhoneNumber}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");

                                updateField("visitorPhoneNumber", value);

                                setValidationErrors((prev) => ({
                                    ...prev,
                                    visitorPhoneNumber: undefined,
                                }));
                            }}
                            placeholder="e.g. 0700000000"
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-xs ${validationErrors.visitorPhoneNumber
                                ? "border-red-300"
                                : "border-gray-200"
                                }`}
                        />

                        {validationErrors.visitorPhoneNumber && (
                            <p className="mt-1 text-xs text-red-500">
                                {validationErrors.visitorPhoneNumber}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium text-[#020B2D]">Access type</label>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                            {(["WALK_IN", "DRIVE_IN", "DELIVERY"] as const).map((type) => (
                                <button key={type} type="button" onClick={() => updateField("visitType", type)}
                                    className={`rounded-xl border px-2 py-3 text-xs font-semibold ${form.visitType === type
                                        ? "border-[#FF4B1F] bg-[#FF4B1F]/10 text-[#FF4B1F]"
                                        : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                                    {type === "WALK_IN" ? "Walk in" : type === "DRIVE_IN" ? "Drive in" : "Delivery"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-[#020B2D]">
                            Unit <span className="text-red-500">*</span>
                        </label>

                        <select
                            value={form.unitId || ""}
                            onChange={(e) => {
                                updateField("unitId", Number(e.target.value));
                                setValidationErrors((prev) => ({
                                    ...prev,
                                    unitId: undefined,
                                }));
                            }}
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-xs  ${validationErrors.unitId
                                ? "border-red-300"
                                : "border-gray-200"
                                }`}
                        >
                            <option value="">Select unit</option>

                            {units?.map((unit) => (
                                <option key={unit.unitId} value={unit.unitId}>
                                    {unit.unitRef} — {unit.propertyName}
                                </option>
                            ))}
                        </select>

                        {validationErrors.unitId && (
                            <p className="mt-1 text-xs text-red-500">
                                {validationErrors.unitId}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium text-[#020B2D]">
                            Expected Arrival <span className="text-red-500">*</span>
                        </label>

                        <input
                            type="datetime-local"
                            value={form.expectedArrivalTime}
                            onChange={(e) => {
                                updateField("expectedArrivalTime", e.target.value);
                                setValidationErrors((prev) => ({
                                    ...prev,
                                    expectedArrivalTime: undefined,
                                }));
                            }}
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-xs  ${validationErrors.expectedArrivalTime
                                ? "border-red-300"
                                : "border-gray-200"
                                }`}
                        />

                        {validationErrors.expectedArrivalTime && (
                            <p className="mt-1 text-xs text-red-500">
                                {validationErrors.expectedArrivalTime}
                            </p>
                        )}
                    </div>
                    <div className="pt-2">
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-[#020B2D]">Purpose</label>
                                <input type="text" value={form.purpose ?? ""}
                                    onChange={(e) => updateField("purpose", e.target.value)}
                                    placeholder={form.visitType === "DELIVERY" ? "Package or food delivery" : "Reason for visit"}
                                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                            </div>

                            {form.visitType === "DELIVERY" && (
                                <>
                                    <div>
                                        <label className="text-sm font-medium text-[#020B2D]">Courier / company <span className="text-red-500">*</span></label>
                                        <input type="text" value={form.companyName ?? ""}
                                            onChange={(e) => { updateField("companyName", e.target.value); setValidationErrors((p) => ({...p, companyName: undefined})); }}
                                            placeholder="e.g. Sendy, DHL, restaurant"
                                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${validationErrors.companyName ? "border-red-300" : "border-gray-200"}`} />
                                        {validationErrors.companyName && <p className="mt-1 text-xs text-red-500">{validationErrors.companyName}</p>}
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-[#020B2D]">Tracking / order reference</label>
                                        <input type="text" value={form.trackingNumber ?? ""}
                                            onChange={(e) => updateField("trackingNumber", e.target.value)}
                                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                                    </div>
                                </>
                            )}

                            {/* Vehicle Plate */}
                            {form.visitType !== "WALK_IN" && <div>
                                <label className="text-sm font-medium text-[#020B2D]">
                                    Vehicle Plate {form.visitType === "DRIVE_IN" && <span className="text-red-500">*</span>}
                                </label>

                                <input
                                    type="text"
                                    value={form.vehiclePlate}
                                    onChange={(e) => { updateField("vehiclePlate", e.target.value.toUpperCase()); setValidationErrors((p) => ({...p, vehiclePlate: undefined})); }}
                                    placeholder="e.g. KDA 123A"
                                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-xs 
                                    placeholder:text-gray-400 focus:border-[#020B2D] focus:outline-none"
                                />

                                <p className="mt-1 text-[11px] text-gray-400">
                                    Used to validate vehicle access at configured smart gates.
                                </p>
                                {validationErrors.vehiclePlate && <p className="mt-1 text-xs text-red-500">{validationErrors.vehiclePlate}</p>}
                            </div>}

                            {/* Parking Lot */}
                            {form.visitType === "DRIVE_IN" && <div>
                                <label className="text-sm font-medium text-[#020B2D]">
                                    Parking Lot
                                </label>

                                <input
                                    type="text"
                                    value={form.parkingLot}
                                    onChange={(e) =>
                                        updateField("parkingLot", e.target.value)
                                    }
                                    placeholder="e.g. Parking A"
                                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs 
                                    placeholder:text-xs placeholder:text-gray-400 focus:border-[#020B2D] focus:outline-none"
                                />
                            </div>}
                        </div>
                    </div>


                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="chargeable"
                            checked={form.chargeable}
                            onChange={(e) => updateField("chargeable", e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                        />
                        <label htmlFor="chargeable" className="text-sm font-medium text-[#020B2D]">
                            Chargeable
                        </label>
                    </div>


                </div>
            )}
        </ModalShell>
    );
}
