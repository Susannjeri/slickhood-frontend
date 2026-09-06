"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Dashboard route failed to render", error?.digest ?? "no-digest");
  }, [error]);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <section className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <AlertTriangle className="h-7 w-7 text-amber-600" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-[#141130]">We couldn’t load this workspace</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your last change was saved. Refresh the workspace or return to the dashboard to continue.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={() => reset()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Try again
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
          </Button>
        </div>
      </section>
    </main>
  );
}
