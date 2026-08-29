"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type PageState = "loading" | "success" | "error";

// ── Inner component — uses useSearchParams, must be inside Suspense ──────────
function FWCallbackContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { handleUpdateFWPayment } = useApi();
  const token = useAuthStore(state => state.token);

  const [state, setState]     = useState<PageState>("loading");
  const [message, setMessage] = useState("");
  const verificationStarted = useRef(false);

  useEffect(() => {
    // SessionHydrator restores the HttpOnly-cookie token asynchronously after a
    // full provider redirect. Do not attempt verification before that finishes.
    if (!token) return;

    const status        = searchParams.get("status") ?? "";
    const tx_ref        = searchParams.get("tx_ref") ?? "";
    const transactionId = searchParams.get("transaction_id") ?? "";

    if (!status || !tx_ref || !transactionId) {
      setMessage("The payment provider returned incomplete verification details.");
      setState("error");
      return;
    }
    if (verificationStarted.current) return;
    verificationStarted.current = true;

    const update = async () => {
      try {
        const res = await handleUpdateFWPayment(status, tx_ref, transactionId);
        if (res?.success) {
          setMessage(res.description ?? "Your card payment was completed successfully.");
          setState("success");
        } else {
          setMessage(res?.description ?? "Payment could not be confirmed. Please contact support.");
          setState("error");
        }
      } catch (err: any) {
        const msg = err?.response?.data?.description ?? "Something went wrong confirming your payment.";
        setMessage(msg);
        setState("error");
      }
    };

    update();
  }, [handleUpdateFWPayment, searchParams, token]);

  const handleGoBack = () => router.push("/dashboard/invoices");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">

      {/* Loading state */}
      {state === "loading" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#EF4217]" />
          <p className="text-sm text-gray-500 font-medium">Confirming your payment…</p>
          <p className="text-xs text-gray-400">Please don't close this tab.</p>
        </div>
      )}

      {/* Result card */}
      {state !== "loading" && (
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className={`h-1.5 w-full ${state === "success" ? "bg-green-500" : "bg-red-500"}`} />

          <div className="p-8 flex flex-col items-center gap-5 text-center">
            {state === "success" ? (
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            )}

            <div>
              <h1 className="text-lg font-bold text-[#141130]">
                {state === "success" ? "Payment Confirmed" : "Payment Failed"}
              </h1>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{message}</p>
            </div>

            <div className="w-full border-t border-gray-100" />

            <Button
              onClick={handleGoBack}
              className="w-full h-10 bg-[#EF4217] hover:bg-[#d63a13] text-white"
            >
              Back to Invoices
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Default export — wraps inner component in Suspense ───────────────────────
// Required by Next.js when useSearchParams() is used in a client component.
// The fallback covers the brief moment before the Suspense boundary resolves.
export default function FWPaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#EF4217]" />
      </div>
    }>
      <FWCallbackContent />
    </Suspense>
  );
}
