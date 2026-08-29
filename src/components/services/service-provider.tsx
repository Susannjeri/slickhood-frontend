"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getServiceProviderProfile } from "@/services/serviceProvider";
import ServiceProviderProfile from "./serviceprovider-profile";
import Services from "./services";

type ProfileStatus = "checking" | "exists" | "missing" | "error";

export default function ServiceProvider() {
    
    const { token } = useAuthStore();

    const [profileStatus, setProfileStatus] = useState<ProfileStatus>("checking");
    const [profileError, setProfileError] = useState<string | null>(null);

    useEffect(() => {
        const checkProfile = async () => {
            if (!token) {
                setProfileStatus("error");
                setProfileError("You are not authenticated. Please log in again.");
                return;
            }

            try {
                setProfileStatus("checking");
                setProfileError(null);

                const response = await getServiceProviderProfile(token);

                if (response.data.success) {
                    setProfileStatus("exists");
                    return;
                }

                if (response.data.code === "S00229") {
                    setProfileStatus("missing");
                    return;
                }

                setProfileStatus("error");
                setProfileError(
                    response.data.description ||
                    "Unable to verify your service provider profile."
                );
            } catch (err: any) {
                console.error("Failed to check service provider profile:", err);

                const responseData = err?.response?.data;

                if (responseData?.code === "S00229") {
                    setProfileStatus("missing");
                    return;
                }

                setProfileStatus("error");
                setProfileError(
                    responseData?.description ||
                    "Unable to load your service provider profile."
                );
            }
        };

        checkProfile();
    }, [token]);

    if (profileStatus === "checking") {
        return (
            <div className="p-6">
                <p className="text-sm text-gray-500">
                    Checking your service provider profile...
                </p>
            </div>
        );
    }

    if (profileStatus === "error") {
        return (
            <div className="p-6">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-700">
                        Unable to load your service provider profile.
                    </p>
                    <p className="mt-1 text-xs text-red-600">{profileError}</p>
                </div>
            </div>
        );
    }

    if (profileStatus === "missing") {
        return <ServiceProviderProfile />;
    }

    // profileStatus === "exists"
    return <Services />;
}