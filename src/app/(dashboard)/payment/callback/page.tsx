"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API } from "@/lib/api";
import { browserSessionMutationInit } from "@/lib/browser-session-security";

// Paystack can redirect the browser before its verify endpoint exposes the final
// transaction state. Keep this bounded so the page reconciles the same payment
// instead of encouraging the customer to start a second checkout.
const CONFIRMATION_ATTEMPTS = 15;
const CONFIRMATION_DELAY_MS = 2_000;

const wait = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds));

async function callbackAccessToken() {
  let response = await fetch("/browser-session/get-token", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (response.status === 401) {
    const refreshed = await fetch("/browser-session/refresh", browserSessionMutationInit());
    if (refreshed.ok) {
      response = await fetch("/browser-session/get-token", {
        credentials: "same-origin",
        cache: "no-store",
      });
    }
  }
  if (!response.ok) throw new Error("Session unavailable");
  const body = await response.json();
  const token = body?.data?.jwt;
  if (typeof token !== "string" || !token) throw new Error("Session unavailable");
  return token;
}

function PaystackCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");
  const [status, setStatus] = useState<"confirming" | "paid" | "pending" | "error">("confirming");

  const confirmPayment = useCallback(async () => {
    if (!reference) {
      setStatus("error");
      return;
    }
    setStatus("confirming");
    try {
      const token = await callbackAccessToken();
      for (let attempt = 1; attempt <= CONFIRMATION_ATTEMPTS; attempt += 1) {
        try {
          const response = await API.post("/payment/paystack/confirm", null, {
            params: { reference },
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.data?.data?.paid) {
            setStatus("paid");
            return;
          }
        } catch (error: unknown) {
          const statusCode = typeof error === "object" && error !== null && "response" in error
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;
          if (statusCode && statusCode < 500) throw error;
        }
        if (attempt < CONFIRMATION_ATTEMPTS) await wait(CONFIRMATION_DELAY_MS);
      }
      setStatus("pending");
    } catch {
      setStatus("error");
    }
  }, [reference]);

  useEffect(() => {
    void confirmPayment();
  }, [confirmPayment]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="h-1.5 bg-green-500" />
        <div className="flex flex-col items-center gap-5 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            {status === "confirming" ? (
              <Loader2 className="h-9 w-9 animate-spin text-[#EF4217]" />
            ) : (
              <CheckCircle2 className={`h-9 w-9 ${status === "paid" ? "text-green-500" : "text-amber-500"}`} />
            )}
          </div>

          <div>
            <h1 className="text-xl font-bold text-[#141130]">
              {status === "paid" ? "Payment confirmed" : status === "confirming" ? "Confirming payment" : "Confirmation pending"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              {status === "paid"
                ? "Your invoice and subscription have been updated."
                : status === "confirming"
                  ? "SlickHood is verifying the payment directly with Paystack."
                  : status === "error"
                    ? "We could not complete the secure confirmation. Your payment will not be charged again when you retry."
                    : "The checkout returned successfully, but Paystack confirmation has not completed yet. SlickHood will continue reconciling it safely."}
            </p>
          </div>

          {reference && (
            <div className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Payment reference
              </p>
              <p className="mt-1 break-all font-mono text-sm font-semibold text-[#141130]">
                {reference}
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl bg-[#FEF3F0] p-3 text-left">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4217]" />
            <p className="text-xs leading-relaxed text-gray-600">
              The backend verifies the amount, currency, reference, signature, and landlord
              destination before marking the invoice paid.
            </p>
          </div>

          {status !== "paid" && status !== "confirming" && (
            <Button onClick={() => void confirmPayment()} variant="outline" className="h-11 w-full">
              Retry confirmation
            </Button>
          )}
          <Button onClick={() => router.push("/dashboard/invoices")} disabled={status === "confirming"}
                  className="h-11 w-full bg-[#EF4217] text-white hover:bg-[#d63a13]">
            View invoices <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PaystackCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#EF4217]" />
        </div>
      }
    >
      <PaystackCallbackContent />
    </Suspense>
  );
}
