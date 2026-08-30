"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export default function AccountActivated() {
  const router = useRouter();
  const roles = useAuthStore(state => state.roles);
  const hasAssignedRole = roles.length > 0;

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-5 py-10 text-[#071744] sm:py-16">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="relative overflow-hidden bg-[#071744] px-8 py-12 text-center text-white sm:px-14">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#ff4b1f]/30" />
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400 text-[#071744] shadow-lg shadow-emerald-950/20">
            <Check className="h-10 w-10 stroke-[3]" />
          </div>
          <p className="relative mt-6 text-sm font-bold uppercase tracking-[0.24em] text-orange-300">Email verified</p>
          <h1 className="relative mt-2 text-4xl font-bold sm:text-5xl">Welcome to SlickHood</h1>
          <p className="relative mx-auto mt-4 max-w-xl text-white/70">Your account is secure. Complete the remaining verification controls before operational access is activated.</p>
        </div>

        <div className="space-y-7 p-8 sm:p-12">
          <div className="grid gap-4 sm:grid-cols-3">
            {["Account created", "Email verified", "Business area secured"].map(item => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" /> {item}
              </div>
            ))}
          </div>

          {hasAssignedRole ? (
            <div className="rounded-3xl border border-orange-200 bg-orange-50 p-6">
              <h2 className="text-xl font-bold">Next: complete identity verification</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">SlickHood will continue from your selected business area, verify the applicable KYC evidence, and only then offer the correct subscription package.</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-xl font-bold">We are confirming your access</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Continue securely so SlickHood can restore your assigned role or tell you exactly what remains.</p>
            </div>
          )}

          <button onClick={() => router.push("/continue-setup")} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#ff4b1f] px-6 py-4 text-base font-bold text-white transition hover:bg-[#e63e14]">
            Continue secure setup <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </main>
  );
}
