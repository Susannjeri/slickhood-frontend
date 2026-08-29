"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileSignature, FileWarning } from "lucide-react";
import { leaseDocumentService } from "@/services/lease-document.service";
import { LeaseDocument } from "@/types/lease-document";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DocumentDashboardWidget() {
  const permissions = useAuthStore((state) => state.permissions);
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const allowed = permissions.includes("view_lease_document");

  useEffect(() => {
    if (!allowed) return;
    leaseDocumentService.list().then((response) => setDocuments(response.data?.data ?? [])).catch(() => setDocuments([]));
  }, [allowed]);

  const awaiting = useMemo(() => documents.filter((d) =>
    ["ISSUED", "ACKNOWLEDGED", "PARTIALLY_SIGNED"].includes(d.status)).length, [documents]);
  const legalReview = useMemo(() => documents.filter((d) => d.legalReviewRequired && d.status === "DRAFT").length, [documents]);

  if (!allowed) return null;
  return (
    <Card className="border dark:border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[#141130] dark:text-white">
          <FileSignature className="h-5 w-5 text-[#EF4217]" /> Documents & notices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-white/5">
            <p className="text-2xl font-bold">{awaiting}</p><p className="text-xs text-muted-foreground">Awaiting action</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20">
            <p className="flex items-center gap-1 text-2xl font-bold"><FileWarning className="h-4 w-4" />{legalReview}</p>
            <p className="text-xs text-muted-foreground">Legal review drafts</p>
          </div>
        </div>
        <Button asChild variant="outline" className="w-full"><Link href="/dashboard/documents">Open documents</Link></Button>
      </CardContent>
    </Card>
  );
}
