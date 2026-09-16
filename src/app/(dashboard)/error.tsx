"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const staleAssetPattern = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|CSS_CHUNK_LOAD_FAILED/i;

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const staleAssetFailure = staleAssetPattern.test(`${error?.name ?? ""} ${error?.message ?? ""}`);

  useEffect(() => {
    console.error("Dashboard route failed to render", error?.digest ?? "no-digest");
    if (!staleAssetFailure) return;

    // A browser that stayed open during a deployment may still reference an
    // older immutable route chunk. Reload once so it receives the current
    // build manifest; the session-scoped marker prevents a reload loop if the
    // failure has another cause.
    const buildRevision = process.env.NEXT_PUBLIC_COMMIT_HASH ?? "unknown";
    const recoveryKey = `slickhood:asset-recovery:${buildRevision}:${window.location.pathname}`;
    if (window.sessionStorage.getItem(recoveryKey)) return;
    window.sessionStorage.setItem(recoveryKey, "attempted");
    window.location.reload();
  }, [error, staleAssetFailure]);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <section className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <AlertTriangle className="h-7 w-7 text-amber-600" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-[#141130]">We couldn’t load this workspace</h1>
        <p className="mt-2 text-sm text-gray-600">
          {staleAssetFailure
            ? "The application was updated while this page was open. Reload to continue with the latest version."
            : "This page could not be displayed. Try again or return to the dashboard to continue."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={() => staleAssetFailure ? window.location.reload() : reset()}>
            <RefreshCw className="mr-2 h-4 w-4" /> {staleAssetFailure ? "Reload application" : "Try again"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
          </Button>
        </div>
      </section>
    </main>
  );
}
