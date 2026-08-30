
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Mail, Lock, User } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { useAuthHydrated } from "@/hooks/useAuthHydrated";
import { registerSchema, RegisterSchema } from "@/lib/validations";
import { Input } from "@/components/ui/input";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { TermsAcceptance } from "@/components/auth/TermsAcceptance";
import { RegistrationStepper } from "@/components/auth/RegistrationStepper";

// Google "G" mark
const GoogleIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

interface GoogleCredentialResponse { credential: string }
interface GoogleIdentityApi {
    accounts: { id: {
        initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
        renderButton: (element: HTMLElement, options: Record<string, string>) => void;
    } };
}

const googleIdentity = () => (window as unknown as { google?: GoogleIdentityApi }).google;

export default function RegisterForm() {

    // State (unchanged, plus googleReady for the render effect)
    const [error, setError]                 = useState<string | null>(null);
    const [showPassword, setShowPassword]   = useState(false);
    const [showConfirm, setShowConfirm]     = useState(false);
    const [loading, setLoading]             = useState(false);
    const [showTerms, setShowTerms]         = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [googleReady, setGoogleReady]     = useState(false);
    const googleBtnRef                      = useRef<HTMLDivElement>(null);
    const credentialHandlerRef              = useRef<(response: GoogleCredentialResponse) => void>(() => undefined);
    const guardCheckedRef                   = useRef(false);
    const registrationInFlightRef           = useRef(false);

    const router = useRouter();
    const { setStep, setToken, setmfaEnabled, settotpEnabled } = useAuthStore();
    const authHydrated = useAuthHydrated();
    const { register, handleGoogleRegister } = useAuth();

    const form = useForm<RegisterSchema>({
        resolver: zodResolver(registerSchema),
        defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
    });

    // Keep an authenticated pending account inside the verification journey.
    // Leaving that journey must be an explicit action from the verification page.
    useEffect(() => {
        if (!authHydrated || guardCheckedRef.current) return;
        guardCheckedRef.current = true;
        const state = useAuthStore.getState();
        if (state.step === "verify" && state.email) {
            router.replace("/verify-code");
            return;
        }
        if (state.step !== "account") router.replace("/role");
    }, [authHydrated, router]);

    // Google credential callback (unchanged)
    credentialHandlerRef.current = async (response: GoogleCredentialResponse) => {
        const roleId = useAuthStore.getState().roleId || 0;
        setLoading(true);
        const result = await handleGoogleRegister(response.credential, roleId);
        if (result.success) {
            setToken(result.token || null);
            setmfaEnabled(result.mfaEnabled);
            settotpEnabled(result.totpEnabled);
            setStep("complete");
            router.push("/account-activated");
        } else {
            setError(result.message);
        }
        setLoading(false);
    };

    // Load GSI + initialize (same client_id + callback). Render moved below.
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => {
            const google = googleIdentity();
            if (google) {
                google.accounts.id.initialize({
                    client_id: process.env.NEXT_PUBLIC_CLIENT_ID || "",
                    callback: response => credentialHandlerRef.current(response),
                });
                setGoogleReady(true);
            }
        };
        document.body.appendChild(script);
        return () => { document.body.removeChild(script); };
    }, []);

    // Render the (transparent) Google button and keep it sized to its container
    useEffect(() => {
        if (!googleReady || !googleBtnRef.current) return;
        const el = googleBtnRef.current;
        const renderBtn = () => {
            const width = Math.min(Math.round(el.offsetWidth) || 320, 400);
            el.innerHTML = "";
            googleIdentity()?.accounts.id.renderButton(el, {
                theme: "outline", size: "large", type: "standard",
                text: "continue_with", width: String(width),
            });
        };
        renderBtn();
        const ro = new ResizeObserver(renderBtn);
        ro.observe(el);
        return () => ro.disconnect();
    }, [googleReady]);

    // Handlers (unchanged)
    const runRegister = async (values: RegisterSchema) => {
        if (registrationInFlightRef.current) return;
        registrationInFlightRef.current = true;
        setLoading(true);
        setError(null);
        try {
            const result = await register(values.email, values.password, values.fullName);
            if (result.success) {
                setStep("verify");
                router.push("/verify-code");
            } else {
                setError(result.message || "Registration failed");
            }
        } finally {
            registrationInFlightRef.current = false;
            setLoading(false);
        }
    };

    async function onSubmit(values: RegisterSchema) {
        if (!termsAccepted) {
            setShowTerms(true);
            return;
        }
        await runRegister(values);
    }

    const handleTermsAccept = () => {
        setTermsAccepted(true);
        setShowTerms(false);
        form.handleSubmit(runRegister)();
    };

    const handleTermsDecline = () => {
        setTermsAccepted(false);
        setShowTerms(false);
    };

    const inputClass =
        "rounded-lg text-sm focus-visible:ring-[#EF4217]";

    return (
        <div className="w-full flex flex-col gap-5 sm:gap-6">

            {/* Stepper */}
            <RegistrationStepper currentStep={2} />

            {/* Heading */}
            <div className="text-center space-y-1">
                <h1 className="text-xl sm:text-3xl font-bold text-[#14235C] dark:text-white">Create your account</h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Fill in your details to get started.</p>
            </div>

            {/* Form */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                    <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-[#14235C] dark:text-white">Full Name</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        <Input placeholder="Enter your full name" autoComplete="name" {...field} className={`pl-10 ${inputClass}`} />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Email (full width) */}
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-[#14235C] dark:text-white">Email Address</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        <Input placeholder="Enter your email" {...field} className={`pl-10 ${inputClass}`} />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Password | Confirm (2 columns on sm+) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold text-[#14235C] dark:text-white">Password</FormLabel>
                                    <FormControl>
                                        <div className="relative h-9">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Create a password"
                                                {...field}
                                                className={`pl-10 pr-10 ${inputClass}`}
                                            />
                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                                        Use 8+ characters with a mix of letters, numbers &amp; symbols.
                                    </p>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold text-[#14235C] dark:text-white">Confirm Password</FormLabel>
                                    <FormControl>
                                        <div className="relative h-9">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <Input
                                                type={showConfirm ? "text" : "password"}
                                                placeholder="Confirm your password"
                                                {...field}
                                                className={`pl-10 pr-10 ${inputClass}`}
                                            />
                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white"
                                                onClick={() => setShowConfirm(!showConfirm)}
                                            >
                                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Terms */}
                    {termsAccepted ? (
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center">✓</span>
                            Policies accepted
                        </p>
                    ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            By creating an account you agree to our{" "}
                            <button
                                type="button"
                                className="text-[#EF4217] underline underline-offset-2 hover:text-[#d63600] font-medium"
                                onClick={() => setShowTerms(true)}
                            >
                                Terms &amp; Policies
                            </button>
                        </p>
                    )}

                    {/* Error */}
                    {error && (
                        <p className="text-red-500 text-sm text-center font-medium">{error}</p>
                    )}
                </form>
            </Form>

            {/* Sign in link + Create account */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 order-2 sm:order-1">
                    Already have an account?{" "}
                    <Link href="/login" className="font-semibold text-[#EF4217] hover:text-[#d63600] transition-colors">
                        Sign in
                    </Link>
                </p>
                <button
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={loading}
                    className="order-1 sm:order-2 w-full sm:w-auto px-8 py-3 bg-[#EF4217] hover:bg-[#d63600] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</>
                    ) : (
                        "Create account"
                    )}
                </button>
            </div>

            {/* Divider + elegant Google button */}
            <div className="space-y-3">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-white/10" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="px-3 bg-white dark:bg-[#1A1740] text-xs text-gray-500 dark:text-gray-400">Or continue with</span>
                    </div>
                </div>

                <div className="relative mx-auto w-full max-w-[400px] h-11">
                    {/* Visual button (clicks pass through) */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-semibold text-gray-700 dark:text-gray-300 pointer-events-none">
                        <GoogleIcon />
                        Continue with Google
                    </div>
                    {/* Real GSI button, transparent, captures the click */}
                    <div ref={googleBtnRef} className="absolute inset-0 opacity-0 overflow-hidden flex items-center justify-center" />
                </div>
            </div>

            {/* Terms modal */}
            <TermsAcceptance open={showTerms} onAccept={handleTermsAccept} onDecline={handleTermsDecline} />
        </div>
    );
}
