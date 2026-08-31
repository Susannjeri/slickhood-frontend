"use client";

import { useState } from "react";
import { X, MapPin, Loader2 } from "lucide-react";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { setupServiceProviderProfile } from "@/services/serviceProvider";

interface ServiceProviderProfileModalProps {
    
    onClose: () => void;
    onSuccess?: () => void;
}

export default function ServiceProviderProfileModal({
    onClose,
    onSuccess,
}: ServiceProviderProfileModalProps) {
    const token = useAuthStore((state) => state.token);

    const [businessName, setBusinessName] = useState("");
    const [consent, setConsent] = useState(false);
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);

    const [isLocating, setIsLocating] = useState(false);

    const [errors, setErrors] = useState<{
        businessName?: string;
        consent?: string;
        location?: string;
    }>({});

    const [apiError, setApiError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Helper: Fetch public IP address for consent tracking
    const getClientIp = async (): Promise<string> => {
        try {
            const res = await axios.get("https://api.ipify.org?format=json");
            return res.data.ip || "127.0.0.1";
        } catch {
            return "127.0.0.1";
        }
    };

    // Helper: Get browser geolocation
    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            setErrors((prev) => ({
                ...prev,
                location: "Geolocation is not supported by your browser.",
            }));
            return;
        }

        setIsLocating(true);
        setErrors((prev) => ({ ...prev, location: undefined }));

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLatitude(Number(pos.coords.latitude.toFixed(6)));
                setLongitude(Number(pos.coords.longitude.toFixed(6)));
                setIsLocating(false);
            },
            (err) => {
                setIsLocating(false);
                setErrors((prev) => ({
                    ...prev,
                    location: "Failed to fetch location. Please enter coordinates manually.",
                }));
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    };

    const handleSubmit = async () => {
        const newErrors: typeof errors = {};
        setApiError(null);

        // Validation
        if (!businessName.trim()) {
            newErrors.businessName = "Business name is required.";
        }

        if (latitude === null || longitude === null) {
            newErrors.location = "Location coordinates are required.";
        }

        if (!consent) {
            newErrors.consent = "You must agree to the terms and conditions.";
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        if (!token) {
            setApiError(" You are not authenticated. Please log in again.");
            return;
        }

        try {
            setIsSubmitting(true);

            const clientIp = await getClientIp();

            const payload = {
                businessName: businessName.trim(),
                consent: true,
                consentIpAddress: clientIp,
                latitude: latitude!,
                longitude: longitude!,
            };

            const response = await setupServiceProviderProfile(token, payload);


            if (response.data?.success || response.status === 200 || response.status === 201) {
                onSuccess?.();
                return;
            }

            setApiError(
                response.data?.description ||
                "Unable to create your service provider profile."
            );
        } catch (error) {
            console.error("Failed to setup profile:", error);

            if (axios.isAxiosError(error)) {
                setApiError(
                    error.response?.data?.description ||
                    error.response?.data?.message ||
                    "Unable to create your service provider profile."
                );
            } else {
                setApiError("Something went wrong. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-[#020B2D]">
                            Set Up Service Provider Profile
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">
                            Provide your business details and location to complete setup.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-[#020B2D] disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="space-y-4 px-6 py-5">
                    {/* API ERROR */}
                    {apiError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                            <p className="text-xs font-medium text-red-700">{apiError}</p>
                        </div>
                    )}

                    {/* BUSINESS NAME */}
                    <div>
                        <label
                            htmlFor="businessName"
                            className="mb-1.5 block text-xs font-medium text-[#020B2D]"
                        >
                            Business Name
                        </label>
                        <input
                            id="businessName"
                            type="text"
                            value={businessName}
                            onChange={(e) => {
                                setBusinessName(e.target.value);
                                if (errors.businessName) {
                                    setErrors((prev) => ({ ...prev, businessName: undefined }));
                                }
                            }}
                            placeholder="e.g. Nairobi Cleaners Ltd"
                            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-xs outline-none focus:border-[#020B2D]"
                        />
                        {errors.businessName && (
                            <p className="mt-1 text-xs text-red-500">{errors.businessName}</p>
                        )}
                    </div>

                    {/* LOCATION (LAT / LNG) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-medium text-[#020B2D]">
                                Location Coordinates
                            </label>
                            <button
                                type="button"
                                onClick={handleDetectLocation}
                                disabled={isLocating}
                                className="flex items-center gap-1 text-xs font-medium text-[#FF4B1F] hover:underline disabled:opacity-50"
                            >
                                {isLocating ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <MapPin className="h-3.5 w-3.5" />
                                )}
                                Detect Location
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <input
                                    type="number"
                                    step="any"
                                    value={latitude ?? ""}
                                    onChange={(e) => {
                                        setLatitude(e.target.value ? parseFloat(e.target.value) : null);
                                        if (errors.location) {
                                            setErrors((prev) => ({ ...prev, location: undefined }));
                                        }
                                    }}
                                    placeholder="Latitude (e.g. -1.2921)"
                                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-xs outline-none focus:border-[#020B2D]"
                                />
                            </div>

                            <div>
                                <input
                                    type="number"
                                    step="any"
                                    value={longitude ?? ""}
                                    onChange={(e) => {
                                        setLongitude(e.target.value ? parseFloat(e.target.value) : null);
                                        if (errors.location) {
                                            setErrors((prev) => ({ ...prev, location: undefined }));
                                        }
                                    }}
                                    placeholder="Longitude (e.g. 36.8219)"
                                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-xs outline-none focus:border-[#020B2D]"
                                />
                            </div>
                        </div>

                        {errors.location && (
                            <p className="mt-1 text-xs text-red-500">{errors.location}</p>
                        )}
                    </div>

                    {/* CONSENT CHECKBOX */}
                    <div className="pt-2">
                        <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={consent}
                                onChange={(e) => {
                                    setConsent(e.target.checked);
                                    if (errors.consent) {
                                        setErrors((prev) => ({ ...prev, consent: undefined }));
                                    }
                                }}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#FF4B1F] focus:ring-[#FF4B1F]"
                            />
                            <span className="text-xs text-gray-600 leading-snug">
                                I agree to the terms of service and consent to registering my location data for service discovery.
                            </span>
                        </label>

                        {errors.consent && (
                            <p className="mt-1 text-xs text-red-500">{errors.consent}</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-md border border-gray-300 px-4 py-2 text-xs font-medium text-[#020B2D] hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="rounded-md bg-[#FF4B1F] px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? "Setting Up..." : "Set Up Profile"}
                    </button>
                </div>
            </div>
        </div>
    );
}
