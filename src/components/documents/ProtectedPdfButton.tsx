"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/store/authStore";
import { ResponsivePdfViewer } from "@/components/documents/ResponsivePdfViewer";

type PdfProps = {load: () => Promise<{data: Blob}>; name: string; label?: string};

export function ProtectedPdfButton(props: PdfProps) {
  const token = useAuthStore(state => state.token);
  const role = useAuthStore(state => state.activeRole?.title);
  const workspace = useAuthStore(state => state.activeWorkspaceId);
  return <PdfPreview key={`${token}:${role}:${workspace}`} {...props} />;
}

/** Fetch with the authenticated API client, never put credentials in a viewer URL. */
function PdfPreview({ load, name, label = "PDF" }: PdfProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const currentUrl = useRef("");

  const release = () => {
    if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    currentUrl.current = "";
  };
  useEffect(() => () => { sequence.current++; release(); }, []);

  const show = async () => {
    const request = ++sequence.current;
    release(); setUrl(""); setError(""); setLoading(true); setOpen(true);
    try {
      const { data } = await load();
      // A JSON error envelope (even with HTTP 200) must not become a broken PDF.
      if (!(data instanceof Blob) || await data.slice(0, 5).text() !== "%PDF-") {
        throw new Error("Invalid PDF response");
      }
      if (sequence.current !== request) return;
      currentUrl.current = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      setUrl(currentUrl.current);
    } catch {
      if (sequence.current === request) setError("The document could not be loaded. Check your connection and access, then retry.");
    } finally { if (sequence.current === request) setLoading(false); }
  };

  const close = (value: boolean) => {
    if (!value) { sequence.current++; release(); setUrl(""); setLoading(false); }
    setOpen(value);
  };

  return <>
    <Button type="button" size="sm" variant="outline" onClick={() => void show()}>{label}</Button>
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[95dvh] flex-col sm:max-w-5xl">
        <DialogHeader><DialogTitle>{name}</DialogTitle>
          <DialogDescription>Review the document below. If your browser cannot display PDFs, use Download PDF.</DialogDescription>
        </DialogHeader>
        {loading && <p role="status">Loading PDF…</p>}
        {error && <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => void show()}>Retry PDF</Button></div>}
        {url && <>
          <ResponsivePdfViewer url={url} title={`${name} PDF preview`} downloadName={`${name.replace(/[^a-zA-Z0-9 -]/g, "_")}.pdf`} />
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
