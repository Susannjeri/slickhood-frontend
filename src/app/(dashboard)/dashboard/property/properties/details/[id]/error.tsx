"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PropertyDetailsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  useEffect(() => {
    // Keep the diagnostic in the browser console without exposing it to users.
    // This is useful when a stale deployment chunk or expired session causes a
    // client transition to fail.
    console.error("Property details route failed to render", error?.digest ?? "no-digest");
  }, [error]);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <section className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <AlertTriangle className="h-7 w-7 text-amber-600" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-[#141130]">We couldn’t open this property</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your property was saved. The page session needs to be refreshed before its details can be shown.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={() => reset()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Try again
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/property/properties")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to properties
          </Button>
        </div>
      </section>
    </main>
  );
}
