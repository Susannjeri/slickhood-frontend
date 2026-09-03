"use client";
import { useEffect, useRef, useState } from "react";
import { Invoice } from "@/types/invoice";
import { useApi } from "@/hooks/useApi";
import { InvoicePayments } from "./InvoicePayments";
import { PaymentModal } from "./PaymentModal";
import { ManualPaymentModal } from "./ManualPaymentModal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FileText, CreditCard, Loader2, Building2, ClipboardList } from "lucide-react";

interface Props {
  invoice: Invoice;
  refetchKey: number; // increments from InvoicesPage on payment success
  onPaymentSuccess: () => void;
}

export function InvoiceDetail({ invoice, refetchKey, onPaymentSuccess }: Props) {
  const { handleViewLeasePDF } = useApi();

  const [pdfUrl, setPdfUrl]         = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError]     = useState<string | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);

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
    <div className="h-full overflow-y-auto space-y-4">
      <section className="overflow-hidden rounded-2xl bg-[#0A0A0B] text-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10">
                {invoice.issuerLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={invoice.issuerLogoUrl} alt="" className="h-full w-full object-contain p-2" />
                ) : (
                  <Building2 className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{invoice.issuerName}</p>
                <p className="text-xs uppercase tracking-wider text-white/55">
                  {invoice.issuerType.replaceAll("_", " ")} · {invoice.ref}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              {invoice.status}
            </span>
          </div>

          <div>
            <p className="text-sm text-white/60">Balance due</p>
            <p className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              {invoice.currency} {invoice.pendingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-2 text-xs text-white/55">
              {invoice.dueDate
                ? `Due ${new Date(invoice.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                : `Issued ${invoice.date}`}
            </p>
          </div>

          {invoice.payableByCurrentUser && (
            <button
              type="button"
              onClick={() => setPayModalOpen(true)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-black transition hover:bg-slate-100"
            >
              <CreditCard className="h-4 w-4" /> Pay balance
            </button>
          )}
          {invoice.recordableByCurrentUser && (
            <button
              type="button"
              onClick={() => setManualModalOpen(true)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-black transition hover:bg-slate-100"
            >
              <ClipboardList className="h-4 w-4" /> Record received payment
            </button>
          )}
        </div>
      </section>

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
      <PaymentModal
        invoice={invoice}
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        onPaymentSuccess={() => {
          setPayModalOpen(false);
          onPaymentSuccess();
        }}
      />
      <ManualPaymentModal
        invoice={invoice}
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onPaymentSuccess={() => {
          setManualModalOpen(false);
          onPaymentSuccess();
        }}
      />
    </div>
  );
}
