"use client";
import { useEffect, useState } from "react";
import { Invoice } from "@/types/invoice";
import { Account } from "@/types/account";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Wallet } from "lucide-react";

interface Props {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

type ModalStep = "accounts" | "confirm";

const MPESA_CODE     = "S0091";
const HOSTED_CHECKOUT_CODE = "S00115";
const PESALINK_CODE  = "S00268";
const MPESA_BANK_CODE = "S00280";
const PAYSTACK_ID    = "PAYSTACK";

// Presigned account icon URLs can expire/break (same gotcha as the rest of
// the Accounts module) — fall back to a plain initial tile rather than a
// broken image.
function AccountIcon({ account, size = 40 }: { account: Account; size?: number }) {
  const [errored, setErrored] = useState(false);
  const src = account.icon ?? account.iconUrl;

  if (!src || errored) {
    return (
      <div
        className="rounded-lg bg-gray-100 flex items-center justify-center shrink-0 font-semibold text-[#EF4217]"
        style={{ width: size, height: size }}
      >
        {(account.channelDisplayName || account.name)?.charAt(0)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={account.channelDisplayName || account.name}
      onError={() => setErrored(true)}
      className="rounded-lg object-contain shrink-0 bg-gray-100"
      style={{ width: size, height: size }}
    />
  );
}

export function PaymentModal({ invoice, open, onClose, onPaymentSuccess }: Props) {
  const { handleListAccounts, handleInitPayment } = useApi();

  const [accounts, setAccounts]         = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  const [step, setStep]         = useState<ModalStep>("accounts");
  const [selected, setSelected] = useState<Account | null>(null);
  const [paying, setPaying]     = useState(false);

  // ── Fetch the property's attached payment accounts when the modal opens ──
  useEffect(() => {
    if (!open) return;
    setStep("accounts");
    setSelected(null);

    const fetch = async () => {
      setAccountsLoading(true);
      try {
        const active = invoice.paymentAccountId
          ? [((await API.get("/payment/invoice/payment-account",{params:{invoiceId:invoice.id}})).data?.data as Account)].filter(a=>a?.active&&a.verified)
          : ((await handleListAccounts({ propertyId: invoice.propertyId ?? undefined })).data ?? []).filter((a: Account) => a.active === true);
        setAccounts(active.filter((account: Account) => account.channel !== "FLUTTER_WAVE"));
      } catch {
        toast.error("Could not load payment accounts. Please try again.");
        onClose();
      } finally {
        setAccountsLoading(false);
      }
    };
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice.propertyId]);

  const handleSelectAccount = (account: Account) => {
    setSelected(account);
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setPaying(true);
    try {
      const res = await handleInitPayment(invoice.ref, selected.id, selected.channel);
      const code: string  = res.code ?? "";
      const desc: string  = res.description ?? "Payment initiated.";

      if (code === MPESA_CODE) {
        toast.message("M-Pesa request sent", {
          description: "Enter your PIN on your phone. The invoice will update only after provider confirmation.",
        });
        onPaymentSuccess();
        onClose();

      } else if (code === PESALINK_CODE || code === MPESA_BANK_CODE) {
        const instructions = Array.isArray(res.data) ? res.data[0] : res.data;
        toast.message(code === PESALINK_CODE ? "PesaLink payment instructions" : "Bank Paybill instructions", {
          description: typeof instructions === "string" ? instructions : desc,
          duration: 12000,
        });
        onClose();

      } else if (code === HOSTED_CHECKOUT_CODE) {
        // Hosted checkout channels (FlutterWave and Paystack) return their
        // secure authorization URL as data[0].
        const redirectUrl: string | undefined = Array.isArray(res.data)
          ? res.data[0]
          : undefined;
        const providerName = "Paystack";

        if (redirectUrl) {
          window.open(redirectUrl, "_blank", "noopener,noreferrer");
          toast.success(desc);
        } else {
          toast.error(`${providerName} redirect URL missing. Please try again.`);
        }
        // Don't call onPaymentSuccess yet. The provider webhook is verified by
        // the backend before the invoice is marked paid.
        onClose();

      } else {
        toast.error(desc || "Payment failed. Please try again.");
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.description ?? "Payment failed. Please try again."
        : "Payment failed. Please try again.";
      toast.error(msg);
    } finally {
      setPaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] rounded-2xl p-0 overflow-hidden">

        {/* Header */}
        <DialogHeader className="border-b border-gray-100 px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-center gap-3">
            {step === "confirm" && (
              <button
                onClick={() => setStep("accounts")}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <DialogTitle className="text-base text-[#141130]">
                {step === "accounts" ? "Choose Payment Account" : "Confirm Payment"}
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Invoice <span className="font-semibold text-[#EF4217]">{invoice.ref}</span>
                {" · "}
                <span className="font-semibold text-[#141130]">
                  {invoice.currency} {invoice.pendingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-4 py-5 sm:px-6">

          {/* ── Step 1: account selection ─────────────────────────────────── */}
          {step === "accounts" && (
            accountsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#EF4217]" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 max-w-[280px]">
                  No payment accounts have been set up for this property. Contact your landlord.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {accounts.map(account => (
                  <button
                    key={account.id}
                    onClick={() => handleSelectAccount(account)}
                    className="flex items-center gap-4 w-full rounded-xl border border-gray-200 bg-white p-4 text-left
                      hover:border-[#EF4217] hover:shadow-sm hover:shadow-orange-100
                      transition-all duration-200 cursor-pointer"
                  >
                    <AccountIcon account={account} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#141130]">{account.name}</p>
                      <p className="text-xs text-gray-400 truncate">{account.channelDisplayName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {/* ── Step 2: confirmation ──────────────────────────────────────── */}
          {step === "confirm" && selected && (
            <div className="flex flex-col items-center gap-6 py-2">
              {/* Account icon + name */}
              <div className="flex flex-col items-center gap-3">
                <AccountIcon account={selected} size={64} />
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#141130]">{selected.name}</p>
                  <p className="text-xs text-gray-400">{selected.channelDisplayName}</p>
                </div>
              </div>

              {/* Amount summary */}
              <div className="w-full rounded-xl bg-[#FEF3F0] border border-[#FDDDD6] p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">You are paying</p>
                <p className="text-2xl font-bold text-[#EF4217]">
                  {invoice.currency} {invoice.pendingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-400 mt-1">for invoice {invoice.ref}</p>
              </div>

              {/* Channel-specific hint */}
              {selected.channel === "MPESA" && (
                <p className="text-xs text-gray-400 text-center -mt-2">
                  An STK push will be sent to your registered M-Pesa number. Enter your PIN to complete the payment.
                </p>
              )}
              {selected.channel === "MPESA_BANK" && (
                <p className="text-xs text-gray-400 text-center -mt-2">
                  You&apos;ll receive the bank Paybill and account reference. SlickHood marks the invoice paid only after the bank callback is verified.
                </p>
              )}
              {selected.channel === PAYSTACK_ID && (
                <p className="text-xs text-gray-400 text-center -mt-2">
                  You&apos;ll be redirected to Paystack to complete this payment. Funds are routed to this property&apos;s landlord account after verification.
                </p>
              )}

              {/* Actions */}
              <div className="flex w-full flex-col-reverse gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  className="flex-1 h-10"
                  onClick={() => setStep("accounts")}
                  disabled={paying}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 h-10 bg-[#EF4217] hover:bg-[#d63a13] text-white"
                  onClick={handleConfirm}
                  disabled={paying}
                >
                  {paying
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : selected.channel === PAYSTACK_ID
                      ? "Continue to Paystack"
                      : "Confirm Payment"
                  }
                </Button>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
