"use client";

import { useForm } from "react-hook-form";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginSchema } from "@/lib/validations";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function LoginForm() {
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleReady, setGoogleReady]   = useState(false);
  const googleBtnRef                    = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const { inviteToken, setEmail, setToken, setmfaEnabled, settotpEnabled, setStep } = useAuthStore();
  const { login, handleGoogleLogin } = useAuth();

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleCredentialResponse = async (response: any) => {
    setLoading(true);
    const result = await handleGoogleLogin(response.credential);
    if (result.success) {
      setStep("complete");
      setToken(result.token || null);
      setmfaEnabled(result.mfaEnabled);
      settotpEnabled(result.totpEnabled);
      setSuccess("Login successful!");
      router.push("/continue-setup");
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google) {
        (window as any).google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_CLIENT_ID || "",
          callback: handleCredentialResponse,
        });
        setGoogleReady(true);
      }
    };
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    if (!googleReady || !googleBtnRef.current) return;
    const el = googleBtnRef.current;
    const renderBtn = () => {
      const width = Math.min(Math.round(el.offsetWidth) || 320, 400);
      el.innerHTML = "";
      (window as any).google.accounts.id.renderButton(el, {
        theme: "outline", size: "large", type: "standard",
        text: "continue_with", width: String(width),
      });
    };
    renderBtn();
    const ro = new ResizeObserver(renderBtn);
    ro.observe(el);
    return () => ro.disconnect();
  }, [googleReady]);

  const handleSignUpClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (inviteToken) {
      e.preventDefault();
      setStep("account");
      router.push("/register");
    }
  };

  async function onSubmit(values: LoginSchema) {
    setError(null);
    setSuccess(null);
    setLoading(true);
    const result = await login(values.email, values.password);
    if (!result.success) {
      setError(result.message || "Login failed");
      setLoading(false);
      return;
    }
    if (result.requiresVerification) {
      setEmail(values.email);
      setStep("verify");
      setSuccess(result.message || "Verification code sent. Redirecting...");
      setLoading(false);
      router.push("/verify-code");
      return;
    }
    if (!result.token) {
      setError("Login could not be completed. Please try again.");
      setLoading(false);
      return;
    }
    setToken(result.token || null);
    setmfaEnabled(result.mfaEnabled);
    settotpEnabled(result.totpEnabled);
    setEmail(values.email);
    setSuccess("Welcome back — checking where you left off...");
    setLoading(false);
    setTimeout(() => router.push("/continue-setup"), 900);
  }

  const inputClass = "rounded-lg text-sm focus-visible:ring-[#EF4217]";

  return (
    <div className="w-full flex flex-col gap-5">

      {/* Heading */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#14235C] dark:text-white">Sign in</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back! Please enter your details.</p>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-[#14235C] dark:text-white">Email Address</FormLabel>
                <FormControl>
                  <div className="relative h-9">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </div>
                    <Input placeholder="you@example.com" {...field} className={`pl-10 ${inputClass}`} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password */}
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
                      placeholder="••••••••"
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
              </FormItem>
            )}
          />

          {/* Remember me + Forgot password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 dark:border-white/20 accent-[#EF4217]"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">Remember me</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[#EF4217] hover:text-[#d63600] transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Feedback */}
          {success && <p className="text-green-600 text-sm text-center font-medium">{success}</p>}
          {error   && <p className="text-red-500  text-sm text-center font-medium">{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#EF4217] hover:bg-[#d63600] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Please wait...</>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </Form>

      {/* Sign up link */}
      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        Don&apos;t have an account?{" "}
        <Link
          href={inviteToken ? "/register" : "/role"}
          onClick={handleSignUpClick}
          className="font-semibold text-[#EF4217] hover:text-[#d63600] transition-colors"
        >
          Sign up
        </Link>
      </p>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-white/10" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-white dark:bg-[#1A1740] text-xs text-gray-500 dark:text-gray-400">
            Or continue with
          </span>
        </div>
      </div>

      {/* Google button — visual overlay + real GSI button */}
      <div className="relative mx-auto w-full max-w-[400px] h-11">
        <div className="absolute inset-0 flex items-center justify-center gap-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-semibold text-gray-700 dark:text-gray-300 pointer-events-none">
          <GoogleIcon />
          Continue with Google
        </div>
        <div ref={googleBtnRef} className="absolute inset-0 opacity-0 overflow-hidden flex items-center justify-center" />
      </div>
    </div>
  );
}
