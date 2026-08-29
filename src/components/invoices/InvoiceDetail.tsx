"use client";
import { useEffect, useRef, useState } from "react";
import { Invoice } from "@/types/invoice";
import { useApi } from "@/hooks/useApi";
import { InvoicePayments } from "./InvoicePayments";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FileText, CreditCard, Loader2 } from "lucide-react";

interface Props {
  invoice: Invoice;
  refetchKey: number; // increments from InvoicesPage on payment success
}

export function InvoiceDetail({ invoice, refetchKey }: Props) {
  const { handleViewLeasePDF } = useApi();

  const [pdfUrl, setPdfUrl]         = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError]     = useState<string | null>(null);

  // Tracks open accordion panels — PDF open by default, payments collapsed
  const [openItems, setOpenItems] = useState<string[]>(["pdf"]);

  const blobUrlRef = useRef<string | null>(null);

  const paymentsOpen = openItems.includes("payments");

  // ── Fetch PDF ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      setPdfUrl(null);
      setPdfError(null);
      setPdfLoading(true);

      try {
        const blob = await handleViewLeasePDF(invoice.id);
        if (isCancelled) return;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setPdfUrl(url);
      } catch {
        if (!isCancelled)
          setPdfError("Could not load PDF. The backend team may still be resolving the CORS issue.");
      } finally {
        if (!isCancelled) setPdfLoading(false);
      }
    };

    load();

    return () => {
      isCancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [invoice.id]);

  return (
    <div className="h-full overflow-y-auto">
      <Accordion
        type="multiple"
        value={openItems}
        onValueChange={setOpenItems}
        className="space-y-3"
      >

        {/* ── Invoice PDF ──────────────────────────────────────────────────── */}
        <AccordionItem
          value="pdf"
          className="border border-gray-200 rounded-xl overflow-hidden"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-gray-50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#EF4217]" />
              <span className="text-sm font-semibold text-[#141130]">Invoice PDF</span>
              <span className="text-xs text-gray-400 font-normal">{invoice.ref}</span>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-0 pb-0">
            <div className="h-[500px] lg:h-[600px] w-full">
              {pdfLoading && (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-[#EF4217]" />
                </div>
              )}
              {pdfError && (
                <div className="flex items-center justify-center h-full px-6">
                  <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    {pdfError}
                  </p>
                </div>
              )}
              {pdfUrl && !pdfLoading && (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  title={`Invoice ${invoice.ref}`}
                />
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Payment Details ──────────────────────────────────────────────── */}
        <AccordionItem
          value="payments"
          className="border border-gray-200 rounded-xl overflow-hidden"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-gray-50">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#EF4217]" />
              <span className="text-sm font-semibold text-[#141130]">Payment Details</span>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-4 pb-4 pt-2">
            <InvoicePayments
              invoice={invoice}
              triggerFetch={paymentsOpen}
              refetchKey={refetchKey}
            />
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}