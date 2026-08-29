"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

function PaystackCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="h-1.5 bg-green-500" />
        <div className="flex flex-col items-center gap-5 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 className="h-9 w-9 text-green-500" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-[#141130]">Payment submitted</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Paystack has returned your payment to SlickHood. We&apos;re confirming it securely
              before updating the invoice.
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

          <Button
            onClick={() => router.push("/dashboard/invoices")}
            className="h-11 w-full bg-[#EF4217] text-white hover:bg-[#d63a13]"
          >
            View invoices
            <ArrowRight className="ml-2 h-4 w-4" />
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
