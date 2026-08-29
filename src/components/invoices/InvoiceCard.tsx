"use client";
import { useState } from "react";
import { Invoice } from "@/types/invoice";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { PaymentModal } from "./PaymentModal";
import { ManualPaymentModal } from "./ManualPaymentModal";
import Can from "@/components/auth/Can";
import { Building2, CreditCard, ClipboardList } from "lucide-react";

interface Props {
  invoice: Invoice;
  isSelected: boolean;
  onClick: () => void;
  onPaymentSuccess: () => void;
}

export function InvoiceCard({ invoice, isSelected, onClick, onPaymentSuccess }: Props) {
  const [payModalOpen, setPayModalOpen]       = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);

  const handlePayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPayModalOpen(true);
  };

  const handleManualClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setManualModalOpen(true);
  };

  const handleSuccess = () => {
    setPayModalOpen(false);
    setManualModalOpen(false);
    onPaymentSuccess();
  };

  // Shared button styles — adapts to selected/unselected card state
  const btnBase = `
    flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold
    transition-all duration-200
    ${isSelected
      ? "bg-white/20 text-white border border-white/40 hover:bg-white/30"
      : "bg-[#EF4217] text-white hover:bg-[#d63a13]"
    }
  `;

  return (
    <>
      <div
        onClick={onClick}
        className={`
          relative p-4 rounded-xl border cursor-pointer transition-all duration-200
          ${invoice.status === "PAID"
            ? "bg-emerald-50 border-emerald-200 hover:border-emerald-300"
            : isSelected
              ? "bg-[#EF4217] border-[#EF4217] shadow-md shadow-orange-200"
              : "bg-[#FEF3F0] border-[#FDDDD6] hover:border-[#EF4217]/40 hover:shadow-sm"
          }
        `}
      >
        {/* Top row: ref + badge */}
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-bold tracking-wide ${isSelected ? "text-white" : "text-[#141130]"}`}>
            {invoice.ref}
          </span>
          <InvoiceStatusBadge status={invoice.status} isSelected={isSelected} />
        </div>

        {/* Property + Unit */}
        <div className={`flex items-center gap-1.5 mb-2 ${isSelected ? "text-orange-100" : "text-gray-500"}`}>
          <Building2 className="w-3 h-3 shrink-0" />
          <span className="text-xs truncate">
            {invoice.propertyName} &mdash; Unit {invoice.unit}
          </span>
        </div>

        {/* Tenant + Date + Amount + Action button */}
        <div className="flex items-end justify-between">
          <div className="flex-1 min-w-0 mr-3">
            <p className={`text-sm font-semibold leading-tight truncate ${isSelected ? "text-white" : "text-[#141130]"}`}>
              {invoice.tenantName}
            </p>
            <p className={`text-xs mt-0.5 ${isSelected ? "text-orange-200" : "text-gray-400"}`}>
              {invoice.date}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <p className={`text-base font-bold ${isSelected ? "text-white" : "text-[#EF4217]"}`}>
              {invoice.currency} {invoice.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>

            {/* Pay button — non-Landlords only, UNPAID invoices only */}
            {invoice.status === "UNPAID" && (
              <>
                <Can roles={["Tenant"]} >
                  <button onClick={handlePayClick} className={btnBase}>
                    <CreditCard className="w-3 h-3" />
                    Pay
                  </button>
                </Can>

                {/* Record Payment button — Landlords only */}
                <Can roles={["Landlord"]}>
                  <button onClick={handleManualClick} className={btnBase}>
                    <ClipboardList className="w-3 h-3" />
                    Record Payment
                  </button>
                </Can>
              </>
            )}
          </div>
        </div>

        {/* Accent bar */}
        {!isSelected && (
          <div className={`absolute left-0 top-3 bottom-3 w-[3px] bg-[#EF4217]/30 rounded-full
              ${invoice.status === "PAID" ? "bg-emerald-500/50" : "bg-[#EF4217]/30"}
            `}/>
        )}
      </div>

      <PaymentModal
        invoice={invoice}
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        onPaymentSuccess={handleSuccess}
      />

      <ManualPaymentModal
        invoice={invoice}
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onPaymentSuccess={handleSuccess}
      />
    </>
  );
}