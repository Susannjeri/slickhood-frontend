"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
  OnboardingContinuation,
  resolveOnboardingContinuation,
} from "@/services/onboarding-continuation.service";

export default function ResumeOnboarding() {
  const router = useRouter();
  const sessionReady = useAuthStore(state => state.sessionReady);
  const token = useAuthStore(state => state.token);
  const activeRole = useAuthStore(state => state.activeRole);
  const selectedBusinessAreaId = useAuthStore(state => state.selectedBusinessAreaId);
  const [continuation, setContinuation] = useState<OnboardingContinuation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await resolveOnboardingContinuation(token, activeRole, selectedBusinessAreaId);
      if (result.complete) {
        router.replace(result.destination);
        return;
      }
      setContinuation(result);
    } catch {
      setError("We could not determine your next setup step. Your progress is safe—please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionReady) return;
    if (!token) {
      setLoading(false);
      setError("Your secure session has expired. Please sign in again to continue your setup.");
      return;
    }
    void load();
    // activeRole is restored together with the token by SessionHydrator.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, token, activeRole?.title, selectedBusinessAreaId]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6f8] px-5 py-12 text-[#071744]">
      <section className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="bg-[#071744] px-8 py-10 text-center text-white sm:px-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400 text-[#071744]">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.22em] text-orange-300">Secure account recovery</p>
          <h1 className="mt-2 text-4xl font-bold">Welcome back</h1>
          <p className="mt-3 text-white/75">Let&apos;s continue where you left off.</p>
        </div>

        <div className="p-8 sm:p-12">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-8 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-[#ff4b1f]" />
              <p>Checking your saved progress…</p>
            </div>
          )}

          {!loading && continuation && (
            <div className="space-y-6">
              <div className="flex gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
                <div>
                  <h2 className="font-bold">Your account and email are verified</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{continuation.message}</p>
                </div>
              </div>
              <button
                onClick={() => router.push(continuation.destination)}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#ff4b1f] px-6 py-4 font-bold text-white transition hover:bg-[#e63e14]"
              >
                Continue setup <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {!loading && error && (
            <div className="space-y-5 text-center">
              <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>
              <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl bg-[#071744] px-6 py-3 font-bold text-white">
                <RotateCcw className="h-4 w-4" /> Try again
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
