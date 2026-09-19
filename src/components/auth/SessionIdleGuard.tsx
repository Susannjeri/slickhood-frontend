"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearCookie } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

const IDLE_MS = Number(process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES ?? 30) * 60_000;
const WARNING_MS = Math.min(2 * 60_000, Math.max(10_000, IDLE_MS / 5));

export default function SessionIdleGuard() {
  const token = useAuthStore(state => state.token);
  const logout = useAuthStore(state => state.logout);
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [warning, setWarning] = useState(false);

  const signOut = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    try { await clearCookie(); } catch { /* local session must still be cleared */ }
    logout();
    router.replace("/login?reason=inactive");
  }, [logout, router]);

  const reset = useCallback(() => {
    if (!token) return;
    if (timer.current) clearTimeout(timer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    setWarning(false);
    warningTimer.current = setTimeout(() => setWarning(true), Math.max(0, IDLE_MS - WARNING_MS));
    timer.current = setTimeout(() => void signOut(), IDLE_MS);
  }, [signOut, token]);

  useEffect(() => {
    if (!token) return;
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach(event => window.addEventListener(event, reset, { passive: true }));
    reset();
    return () => {
      events.forEach(event => window.removeEventListener(event, reset));
      if (timer.current) clearTimeout(timer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);
    };
  }, [reset, token]);

  if (!token || !warning) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="idle-title">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <h2 id="idle-title" className="text-xl font-semibold text-[#141130]">Your session is about to end</h2>
      <p className="mt-2 text-sm text-slate-600">For your security, Slickhood signs you out after {Math.round(IDLE_MS / 60_000)} minutes without activity.</p>
      <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => void signOut()}>Sign out now</Button><Button onClick={reset}>Stay signed in</Button></div>
    </div>
  </div>;
}
