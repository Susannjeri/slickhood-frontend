"use client";
import { useRef, useState } from "react";
import { Invoice } from "@/types/invoice";
import { InvoiceList } from "./InvoiceList";
import { InvoiceDetail } from "./InvoiceDetail";
import { FileText, Loader2 } from "lucide-react";
import { useIsInvoiceMobile } from "@/hooks/use-invoice-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function InvoicesPage() {
  const isMobile = useIsInvoiceMobile(); // null | true | false

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [sheetOpen, setSheetOpen]             = useState(false);

  // Increments when any payment succeeds — passed to InvoiceDetail to bust cache
  const [paymentRefetchKey, setPaymentRefetchKey] = useState(0);

  // Ref to InvoiceList's refetch function — called after payment to reload cards
  const invoiceListRefetchRef = useRef<(() => void) | null>(null);

  const handleSelect = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    if (isMobile) setSheetOpen(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentRefetchKey(k => k + 1);   // refreshes payments accordion
    invoiceListRefetchRef.current?.();   // refreshes invoice cards
  };

  if (isMobile === null) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <Loader2 className="w-6 h-6 animate-spin text-[#EF4217]" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 p-4 lg:p-6 h-[calc(100vh-80px)]">

      {/* Left panel */}
      <div className="w-full lg:w-[380px] lg:shrink-0 bg-white rounded-xl border border-gray-200 p-4 lg:p-5 overflow-hidden flex flex-col">
        <InvoiceList
          selectedId={selectedInvoice?.id ?? null}
          onSelect={handleSelect}
          autoSelectFirst={!isMobile}
          onPaymentSuccess={handlePaymentSuccess}
          onRefetchReady={fn => { invoiceListRefetchRef.current = fn; }}
        />
      </div>

      {/* Right panel — desktop only */}
      <div className="hidden lg:flex flex-1 flex-col bg-white rounded-xl border border-gray-200 p-5 overflow-hidden min-w-0">
        {selectedInvoice
          ? <InvoiceDetail invoice={selectedInvoice} refetchKey={paymentRefetchKey} />
          : <EmptyDetail />
        }
      </div>

      {/* Mobile sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:w-[480px] p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-0 shrink-0">
            <SheetTitle className="text-base text-[#141130]">Invoice Details</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden p-5 pt-3">
            {selectedInvoice && (
              <InvoiceDetail invoice={selectedInvoice} refetchKey={paymentRefetchKey} />
            )}
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
        <FileText className="w-7 h-7 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-500">No invoice selected</p>
      <p className="text-xs text-gray-400">Click an invoice on the left to view its details</p>
    </div>
  );
}