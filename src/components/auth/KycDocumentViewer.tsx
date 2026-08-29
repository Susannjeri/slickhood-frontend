"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileSearch, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchKycDocumentContent, KycDocument } from "@/services/kyc.service";

export function KycDocumentViewer({ document, className }: { document: KycDocument; className?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string>();

  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

  const view = async () => {
    setOpen(true); setLoading(true);
    try {
      const blob = await fetchKycDocumentContent(document.id);
      setObjectUrl(previous => { if (previous) URL.revokeObjectURL(previous); return URL.createObjectURL(blob); });
    } catch {
      setOpen(false);
      toast.error("This protected document could not be opened. Refresh the KYC case and try again.");
    } finally { setLoading(false); }
  };

  const contentType = document.contentType ?? "";
  return <>
    <Button type="button" variant="outline" className={className} onClick={view}>
      <FileSearch className="mr-2 h-4 w-4" />View protected original
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="h-[92vh] max-w-[95vw] grid-rows-[auto_1fr] overflow-hidden p-4 sm:max-w-6xl">
        <DialogHeader className="pr-10">
          <DialogTitle>{document.originalFileName || document.documentType.replaceAll("_", " ")}</DialogTitle>
          <DialogDescription>Private KYC evidence · access is authenticated and never cached.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-hidden rounded-xl border bg-slate-100">
          {loading && <div className="flex h-full items-center justify-center"><Loader2 className="mr-2 h-6 w-6 animate-spin" />Opening protected document…</div>}
          {!loading && objectUrl && contentType.startsWith("image/") && <img src={objectUrl} alt="Uploaded KYC original" className="h-full w-full object-contain" />}
          {!loading && objectUrl && !contentType.startsWith("image/") && <iframe title="Uploaded KYC original" src={objectUrl} className="h-full w-full bg-white" />}
        </div>
        {objectUrl && <a href={objectUrl} target="_blank" rel="noreferrer" className="absolute right-14 top-4 text-slate-500 hover:text-[#EF4217]" aria-label="Open document in a new tab"><ExternalLink className="h-4 w-4" /></a>}
      </DialogContent>
    </Dialog>
  </>;
}
