"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getServiceCategories, getServiceProviderProfile, setServiceProviderPaymentAccount } from "@/services/serviceProvider";
import { listAccounts } from "@/lib/api";
import type { Account } from "@/types/account";

import { Settings, Pencil } from "lucide-react";
import ServiceProviderProfileModal from "./serviceprovider-profile-modal";
import AddServiceModal from "./add-service-modal";
import ServiceCategoryDetailsModal from "./servicecategorydetailsmodal";

interface ServiceProviderProfileData {
    id?: number;
    businessName: string;
    description: string;
    phoneNumber: string;
    email: string;
    paymentAccountId?: number;
}

interface ServiceCategory {
    id: number;
    name: string;
    description: string;
    requiredDocumentTypes: string[];
    requiredNumberOfReferees: number;
}

interface ServiceProviderProfileProps {
    onProfileCreated?: () => void;
}

export default function ServiceProviderProfile({
    onProfileCreated,
}: ServiceProviderProfileProps) {

    const token = useAuthStore((state) => state.token);

    // ---------------------------------------------------
    // PROFILE STATE
    // ---------------------------------------------------
    const [profile, setProfile] =
        useState<ServiceProviderProfileData | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [merchantAccounts, setMerchantAccounts] = useState<Account[]>([]);
    const [paymentAccountMessage, setPaymentAccountMessage] = useState<string | null>(null);

    // ---------------------------------------------------
    // CATEGORY STATE
    // ---------------------------------------------------
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [categoriesError, setCategoriesError] = useState<string | null>(null);
    const [showAddService, setShowAddService] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
    const [showCategoryDetails, setShowCategoryDetails] = useState(false);

    // ---------------------------------------------------
    // FETCH PROFILE
    // ---------------------------------------------------
    const fetchProfile = async () => {
        if (!token) {
            setProfileError("You are not authenticated. Please log in again.");
            setProfileLoading(false);
            return;
        }

        try {
            setProfileLoading(true);
            setProfileError(null);

            const response = await getServiceProviderProfile(token);

            if (response.data.success) {
                setProfile(response.data.data);
                return;
            }

            if (response.data.code === "S00229") {
                setProfile(null);
                return;
            }

            setProfileError(
                response.data.description ||
                "Unable to load your service provider profile."
            );
        } catch (err: any) {
            console.error("Failed to load service provider profile:", err);

            const responseData = err?.response?.data;

            if (responseData?.code === "S00229") {
                setProfile(null);
                return;
            }

            setProfileError(
                responseData?.description ||
                "Unable to load your service provider profile."
            );
        } finally {
            setProfileLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [token]);

    useEffect(() => {
        if (!token || !profile) return;
        listAccounts(token, { byLandlord: true, size: 100 })
            .then((response) => setMerchantAccounts((response.data?.data ?? []).filter((account: Account) => account.category === "MERCHANT" && account.active && account.verified)))
            .catch(() => setPaymentAccountMessage("Verified merchant accounts could not be loaded."));
    }, [token, profile?.id]);

    const savePaymentAccount = async (paymentAccountId: number) => {
        if (!token || !paymentAccountId) return;
        try {
            await setServiceProviderPaymentAccount(token, paymentAccountId);
            setPaymentAccountMessage("Payment destination saved.");
            await fetchProfile();
        } catch (err: any) {
            setPaymentAccountMessage(err?.response?.data?.description ?? "Payment destination could not be saved.");
        }
    };

    // ---------------------------------------------------
    // FETCH CATEGORIES — only once a profile exists
    // ---------------------------------------------------

    useEffect(() => {
        const fetchCategories = async () => {
            if (!token) {
                setCategoriesLoading(false);
                return;
            }

            try {
                setCategoriesLoading(true);
                setCategoriesError(null);

                const response = await getServiceCategories(token);


                setCategories(response.data.data ?? []);
            } catch (err: any) {
                console.error("Failed to fetch service categories:", err);


                setCategoriesError(
                    err?.response?.data?.description ||
                    "Failed to load service categories."
                );
            } finally {
                setCategoriesLoading(false);
            }
        };

        fetchCategories();
    }, [token]);

    // =====================================================
    // PROFILE LOADING
    // =====================================================

    if (profileLoading) {
        return (
            <div className="px-4 py-6">
                <p className="text-sm text-gray-500">
                    Loading your service provider profile...
                </p>
            </div>
        );
    }

    // =====================================================
    // PROFILE ERROR
    // =====================================================

    if (profileError) {
        return (
            <div className="px-4 py-6">
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm font-medium text-red-700">
                        Unable to load your profile
                    </p>

                    <p className="mt-1 text-xs text-red-600">
                        {profileError}
                    </p>
                </div>
            </div>
        );
    }

    // =====================================================
    // PROFILE DOES NOT EXIST
    // =====================================================

    if (!profile) {

        return (
            <div className="px-4 py-6">

                {!profile ? (
                    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

                        {/* Decorative background */}
                        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#FF4B1F]/10 blur-3xl" />
                        <div className="absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-[#020B2D]/5 blur-3xl" />

                        <div className="relative grid grid-cols-1 items-center gap-8 px-6 py-8 md:grid-cols-[1fr_auto] md:px-8 lg:px-10">

                            {/* LEFT — Main message */}
                            <div>

                                {/* Small label */}
                                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#FF4B1F]/5 px-3 py-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF4B1F]" />

                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#FF4B1F]">
                                        Get Started
                                    </span>
                                </div>

                                {/* Heading */}
                                <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-[#020B2D]">
                                    Turn your skills into a service customers can find.
                                </h2>

                                {/* Description */}
                                <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500">
                                    Set up your service provider profile to showcase what you
                                    offer, build trust with customers, and start providing
                                    services through the platform.
                                </p>

                                {/* CTA */}
                                <div className="mt-6 flex flex-wrap items-center gap-4">

                                    <button
                                        type="button"
                                        onClick={() => setShowProfileModal(true)}
                                        className="group inline-flex items-center gap-2 rounded-lg bg-[#FF4B1F] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                                    >
                                        Set Up Your Profile

                                        <span className="transition-transform duration-200 group-hover:translate-x-1">
                                            →
                                        </span>
                                    </button>

                                    <span className="text-xs text-gray-400">
                                        Quick and easy setup
                                    </span>
                                </div>
                            </div>

                            {/* RIGHT — Setup preview */}
                            <div className="hidden w-64 md:block">

                                <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">

                                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                        Getting started
                                    </p>

                                    <div className="space-y-3">

                                        {/* Step 1 */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF4B1F] text-[11px] font-semibold text-white">
                                                1
                                            </div>

                                            <div>
                                                <p className="text-xs font-medium text-[#020B2D]">
                                                    Create your profile
                                                </p>

                                                <p className="text-[10px] text-gray-400">
                                                    Tell customers about your business
                                                </p>
                                            </div>
                                        </div>

                                        {/* Connector */}
                                        <div className="ml-3.5 h-3 w-px bg-gray-200" />

                                        {/* Step 2 */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-[11px] font-semibold text-gray-400">
                                                2
                                            </div>

                                            <div>
                                                <p className="text-xs font-medium text-[#020B2D]">
                                                    Add your services
                                                </p>

                                                <p className="text-[10px] text-gray-400">
                                                    Choose what you want to offer
                                                </p>
                                            </div>
                                        </div>

                                        {/* Connector */}
                                        <div className="ml-3.5 h-3 w-px bg-gray-200" />

                                        {/* Step 3 */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-[11px] font-semibold text-gray-400">
                                                3
                                            </div>

                                            <div>
                                                <p className="text-xs font-medium text-[#020B2D]">
                                                    Start offering
                                                </p>

                                                <p className="text-[10px] text-gray-400">
                                                    Connect with customers
                                                </p>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>



                ) : (
                    <div className="w-full rounded-xl border border-gray-200 bg-white shadow-sm">
                        {/* EXISTING PROFILE UI */}
                    </div>
                )}

                {/* ================================================= */}
                {/* SERVICE CATEGORIES                                */}
                {/* ================================================= */}

                <div className="mt-4">
                    {/* Section header */}
                    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold text-[#020B2D]">
                                    Service Categories
                                </h2>

                                {!categoriesLoading && categories.length > 0 && (
                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                                        {categories.length}
                                    </span>
                                )}
                            </div>

                            <p className="mt-0 text-xs text-gray-500">
                                Explore the types of services you can offer to
                                customers.
                            </p>
                        </div>

                        {!profile && (
                            <button
                                type="button"
                                onClick={() => setShowProfileModal(true)}
                                className="text-xs font-medium text-[#FF4B1F] hover:underline"
                            >
                                Get started →
                            </button>
                        )}
                    </div>

                    {/* Loading */}
                    {categoriesLoading && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3, 4, 5, 6].map((item) => (
                                <div
                                    key={item}
                                    className="h-40 animate-pulse rounded-xl border border-gray-200 bg-white"
                                />
                            ))}
                        </div>
                    )}

                    {/* Error */}
                    {categoriesError && !categoriesLoading && (
                        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4">
                            <p className="text-sm font-medium text-red-700">
                                Unable to load service categories
                            </p>

                            <p className="mt-1 text-xs text-red-600">
                                {categoriesError}
                            </p>
                        </div>
                    )}

                    {/* Empty */}
                    {!categoriesLoading &&
                        !categoriesError &&
                        categories.length === 0 && (
                            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
                                <p className="text-sm font-medium text-gray-600">
                                    No service categories available
                                </p>

                                <p className="mt-1 text-xs text-gray-400">
                                    Service categories will appear here when they
                                    become available.
                                </p>
                            </div>
                        )}

                    {/* Categories */}
                    {!categoriesLoading &&
                        !categoriesError &&
                        categories.length > 0 && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {categories.map((category) => (
                                    <div
                                        key={category.id}
                                        className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
                                    >
                                        {/* Accent */}
                                        <div className="absolute left-0 top-0 h-full w-1 bg-[#FF4B1F] opacity-0 transition-opacity group-hover:opacity-100" />

                                        <div className="flex h-full flex-col">

                                            {/* Category icon */}
                                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#020B2D]/5">
                                                <Settings
                                                    className="h-4 w-4 text-[#020B2D]"
                                                    strokeWidth={1.8}
                                                />
                                            </div>

                                            {/* Name */}
                                            <h3 className="text-sm font-semibold text-[#020B2D]">
                                                {category.name}
                                            </h3>

                                            {/* Description */}
                                            <p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-500">
                                                {category.description}
                                            </p>

                                            {/* CTA */}
                                            <div className="mt-auto pt-5">
                                                {!profile ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedCategory(category);
                                                            setShowCategoryDetails(true);
                                                        }}
                                                        className="inline-flex items-center text-xs font-semibold text-[#FF4B1F] transition group-hover:gap-1.5"
                                                    >
                                                        View category details
                                                        <span className="ml-1 transition-transform group-hover:translate-x-0.5">
                                                            →
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedCategory(category);
                                                            setShowCategoryDetails(true);
                                                        }}
                                                        className="inline-flex items-center text-xs font-semibold text-[#FF4B1F] transition group-hover:gap-1.5"
                                                    >
                                                        View category details

                                                        <span className="ml-1 transition-transform group-hover:translate-x-0.5">
                                                            →
                                                        </span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                </div>

                {/* ================================================= */}
                {/* PROFILE MODAL                                     */}
                {/* ================================================= */}

                {showProfileModal && (
                    <ServiceProviderProfileModal
                        onClose={() => setShowProfileModal(false)}
                        onSuccess={() => {
                            setShowProfileModal(false);
                            fetchProfile();
                            onProfileCreated?.();
                        }}
                    />
                )}

                {showCategoryDetails && selectedCategory && (
                    <ServiceCategoryDetailsModal
                        category={selectedCategory}
                        profileExists={!!profile}
                        onClose={() => {
                            setShowCategoryDetails(false);
                            setSelectedCategory(null);
                        }}
                        onSetUpProfile={() => {
                            setShowCategoryDetails(false);
                            setSelectedCategory(null);
                            setShowProfileModal(true);
                        }}
                    />
                )}
            </div>
        );
    }

    // =====================================================
    // PROFILE EXISTS
    // =====================================================

    return (
        <div className="px-4 py-6">
            <div className="w-full rounded-xl border border-gray-200 bg-white shadow-sm">

                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                    <div>
                        <h2 className="text-lg font-semibold text-[#020B2D]">
                            Service Provider Profile
                        </h2>

                        <p className="mt-1 text-xs text-gray-500">
                            Manage your business information and
                            contact details.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowProfileModal(true)}
                        className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-[#020B2D] hover:bg-gray-50"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit Profile
                    </button>
                </div>

                {/* PROFILE INFORMATION */}
                <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">

                    <div>
                        <p className="text-xs font-medium text-gray-500">
                            Business Name
                        </p>

                        <p className="mt-1 text-sm font-medium text-[#020B2D]">
                            {profile.businessName}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs font-medium text-gray-500">
                            Email Address
                        </p>

                        <p className="mt-1 text-sm text-[#020B2D]">
                            {profile.email}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs font-medium text-gray-500">
                            Phone Number
                        </p>

                        <p className="mt-1 text-sm text-[#020B2D]">
                            {profile.phoneNumber}
                        </p>
                    </div>

                    <div className="md:col-span-2">
                        <p className="text-xs font-medium text-gray-500">
                            Business Description
                        </p>

                        <p className="mt-1 text-sm leading-6 text-gray-700">
                            {profile.description}
                        </p>
                    </div>

                    <div className="md:col-span-2 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4B1F]">Customer payment destination</p>
                        <p className="mt-1 text-xs text-gray-600">Bookings can only be accepted after you choose a verified merchant account. Each accepted booking keeps this account as an audit snapshot.</p>
                        <select
                            value={profile.paymentAccountId ?? 0}
                            onChange={(event) => savePaymentAccount(Number(event.target.value))}
                            className="mt-3 w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm md:max-w-md"
                        >
                            <option value={0}>Select a verified merchant account</option>
                            {merchantAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.channel}</option>)}
                        </select>
                        {paymentAccountMessage && <p className="mt-2 text-xs text-gray-600">{paymentAccountMessage}</p>}
                        {!merchantAccounts.length && <p className="mt-2 text-xs text-amber-700">Create and verify a MERCHANT payment account in Accounts before accepting bookings.</p>}
                    </div>
                </div>
            </div>

            {/* ================================================= */}
            {/* SERVICE CATEGORIES                                 */}
            {/* ================================================= */}

            <div className="mt-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div className="text-sm text-gray-500">
                        <input
                            type="text"
                            placeholder="Search categories..."
                            className="h-9 w-64 rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-[#020B2D]"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowAddService(true)}
                            className="rounded-md bg-[#FF4B1F] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                        >
                            + Add Service
                        </button>
                    </div>
                </div>

                {categoriesLoading && (
                    <p className="text-sm text-gray-500">
                        Loading service categories...
                    </p>
                )}

                {categoriesError && !categoriesLoading && (
                    <p className="text-sm text-red-500">{categoriesError}</p>
                )}

                {!categoriesLoading && !categoriesError && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {categories.map((category) => (
                            <div
                                key={category.id}
                                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                            >
                                <h2 className="text-base font-semibold text-[#020B2D]">
                                    {category.name}
                                </h2>

                                <p className="mt-1.5 text-xs leading-5 text-gray-500">
                                    {category.description}
                                </p>

                                <button
                                    type="button"
                                    className="mt-4 text-xs font-medium text-[#020B2D] hover:underline"
                                >
                                    View Services →
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showProfileModal && (
                <ServiceProviderProfileModal
                    onClose={() => setShowProfileModal(false)}
                    onSuccess={() => {
                        setShowProfileModal(false);
                        fetchProfile();
                        onProfileCreated?.();
                    }}
                />
            )}

            {showAddService && (
                <AddServiceModal
                    categories={categories}
                    onClose={() => setShowAddService(false)}
                />
            )}
        </div>
    );


}
