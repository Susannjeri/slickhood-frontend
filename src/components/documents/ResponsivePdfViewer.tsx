"use client";

import { ExternalLink, FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  url: string;
  title: string;
  downloadName?: string;
  frameClassName?: string;
  allowDownload?: boolean;
};

/**
 * Mobile Firefox, Chrome and iOS browsers do not consistently render protected
 * blob PDFs in an iframe. Give small screens an explicit native-viewer handoff
 * while retaining the in-page preview on desktop.
 */
export function ResponsivePdfViewer({
  url,
  title,
  downloadName,
  frameClassName = "h-[65dvh] w-full rounded border",
  allowDownload = true,
}: Props) {
  return <>
    {allowDownload && downloadName && <Button asChild variant="outline"><a href={url} download={downloadName}><FileDown className="mr-2 h-4 w-4" />Download PDF</a></Button>}
    <div className="space-y-3 rounded-xl border bg-slate-50 p-5 text-center md:hidden">
      <FileText className="mx-auto h-10 w-10 text-[#EF4217]" />
      <p className="font-semibold text-[#141130]">Open this PDF in your phone&apos;s document viewer</p>
      <p className="text-sm text-muted-foreground">The secure file stays available only in this signed-in browser session.</p>
      <Button asChild className="w-full"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open PDF</a></Button>
    </div>
    <iframe title={title} src={url} className={`hidden md:block ${frameClassName}`} />
  </>;
}
