"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Wallet } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Account } from "@/types/account";
import { SubscriptionPlan } from "@/types/subscription";
import {
  getCurrentSubscription,
  getSubscriptionPaymentAccounts,
  initSubscriptionPayment,
  renewSubscription,
  subscribeToPlan,
  SubscriptionCheckout,
} from "@/services/subscription.service";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  plan: SubscriptionPlan | null;
  role: string;
  token: string;
  onClose: () => void;
  onComplete: () => void;
  mode?: "subscribe" | "renew";
}

type Step = "method" | "waiting" | "success" | "failed";

function accountIcon(account: Account) {
  const src = account.icon ?? account.iconUrl;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="h-12 w-12 rounded-xl object-contain" />;
  }
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef2ff] font-bold text-[#0b1b5c]">
      {(account.channelDisplayName || account.name).slice(0, 1)}
    </span>
  );
}

export default function SubscriptionCheckoutModal({ open, plan, role, token, onClose, onComplete, mode = "subscribe" }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<Step>("method");
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState<SubscriptionCheckout | null>(null);
  const [paymentInstructions, setPaymentInstructions] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selected = useMemo(() => accounts.find(account => account.id === selectedId) ?? null, [accounts, selectedId]);
  const isFree = plan ? Number(plan.price) <= 0 : false;

  useEffect(() => {
    if (!open) return;
    setStep("method");
    setCheckout(null);
    setPaymentInstructions(null);
    setErrorMessage(null);
    setSelectedId(null);
    if (isFree) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getSubscriptionPaymentAccounts(token)
      .then(response => setAccounts((response.data.data ?? []).filter(account => account.active && account.verified)))
      .catch(() => toast.error("Could not load subscription payment methods."))
      .finally(() => setLoading(false));
  }, [open, token, isFree]);

  useEffect(() => {
    if (step !== "waiting" || !plan) return;
    let checks = 0;
    const timer = window.setInterval(async () => {
      checks += 1;
      try {
        const response = await getCurrentSubscription(token, role);
        const current = response.data?.data?.[0];
        if (current?.planDetails?.code === plan.code || current?.planCode === plan.code) {
          window.clearInterval(timer);
          setStep("success");
          onComplete();
        }
      } catch {
        // A transient poll error must not restart or duplicate payment.
      }
      if (checks >= 24) window.clearInterval(timer);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [step, plan, token, role, onComplete]);

  if (!plan) return null;

  const startCheckout = async () => {
    if (!selected && !isFree) return;
    if (selected?.channel === "MPESA" && !/^\+?254\d{9}$/.test(phone.replace(/\s/g, ""))) {
      toast.error("Enter a valid Kenyan M-Pesa number, for example +254712345678.");
      return;
    }
    setLoading(true);
    try {
      const subscribeResponse = mode === "renew"
        ? await renewSubscription(token, role, selected?.id ?? null)
        : await subscribeToPlan(token, {
            role,
            planCode: plan.code,
            paymentAccountId: selected?.id ?? null,
          });
      const pending = subscribeResponse.data?.data?.[0] as SubscriptionCheckout | undefined;
      if (!pending?.invoiceRef) {
        setStep("success");
        onComplete();
        return;
      }
      setCheckout(pending);
      if (!selected) throw new Error("A payment method is required for a paid plan.");
      const paymentResponse = await initSubscriptionPayment(
        token, pending.invoiceRef, selected.id, selected.channel,
        selected.channel === "MPESA" ? phone.replace(/\s/g, "") : undefined
      );
      const redirectUrl = paymentResponse.data?.data?.[0];
      setPaymentInstructions(
        typeof redirectUrl === "string" && !redirectUrl.startsWith("http") ? redirectUrl : null
      );
      if (selected.channel === "MPESA") {
        setStep("waiting");
      } else if (typeof redirectUrl === "string" && redirectUrl.startsWith("http")) {
        window.open(redirectUrl, "_blank", "noopener,noreferrer");
        setStep("waiting");
      } else {
        setStep("waiting");
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.description ?? "Could not start subscription payment."
        : "Could not start subscription payment.";
      setErrorMessage(message);
      setStep("failed");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={value => { if (!value && !loading) onClose(); }}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto rounded-[28px] border border-[#dce4ef] bg-[#fbfbfc] p-0">
        <DialogTitle className="sr-only">Subscription payment</DialogTitle>
        <div className="border-l-4 border-[#ff5b15] px-4 py-6 sm:border-l-[8px] sm:px-12 sm:py-7">
          {step === "method" && (
            <>
              <button onClick={onClose} className="ml-auto flex items-center gap-1 text-sm font-semibold text-slate-500">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="text-center">
                <h2 className="text-3xl font-bold text-[#020b2d]">{isFree ? "Confirm Plan" : "Payment Method"}</h2>
                <p className="mt-1 text-slate-400">{isFree ? "Confirm activation of this free plan." : "Choose how you would like to pay."}</p>
              </div>
              <div className="mx-auto mt-7 flex max-w-lg flex-col gap-2 rounded-2xl border-2 border-[#ff5b15] bg-white px-4 py-4 text-center sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:text-left">
                <span className="font-bold text-[#020b2d]">{plan.displayName}</span>
                <span className="text-2xl font-bold text-[#ff5b15]">
                  {plan.currency} {Number(plan.price).toLocaleString()} <small className="text-sm font-normal text-slate-400">/ {plan.billingCycle.toLowerCase()}</small>
                </span>
              </div>
              <div className="mx-auto mt-4 max-w-lg space-y-3">
                {isFree ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center text-sm text-emerald-800">
                    No payment is required. Your plan will activate immediately after confirmation.
                  </div>
                ) : loading ? (
                  <Loader2 className="mx-auto my-12 h-7 w-7 animate-spin text-[#ff5b15]" />
                ) : accounts.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                    <Wallet className="mx-auto mb-3 h-7 w-7" /> No verified SlickHood payment account is available.
                  </div>
                ) : accounts.map(account => (
                  <button key={account.id} onClick={() => setSelectedId(account.id)}
                    className={`flex w-full items-center gap-5 rounded-2xl border-2 bg-white px-6 py-4 text-left transition ${selectedId === account.id ? "border-[#ff5b15] shadow-sm" : "border-[#dce4ef] hover:border-[#ff9a73]"}`}>
                    {accountIcon(account)}
                    <span><strong className="block text-lg text-[#0b1b5c]">{account.channelDisplayName || account.name}</strong>
                      <small className="text-slate-500">{account.name}</small></span>
                  </button>
                ))}
              </div>
              {selected?.channel === "MPESA" && (
                <div className="mx-auto mt-4 max-w-lg">
                  <label className="mb-2 block text-sm font-semibold text-[#0b1b5c]">M-Pesa phone number</label>
                  <input value={phone} onChange={event => setPhone(event.target.value)} placeholder="+254 712 345 678"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#ff5b15]" />
                </div>
              )}
              <button onClick={startCheckout} disabled={(!isFree && !selected) || loading}
                className="mx-auto mt-7 flex h-12 w-full max-w-lg items-center justify-center gap-2 rounded-lg bg-[#ff5b15] text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{isFree ? "Activate Plan" : "Continue"} <ArrowRight className="h-5 w-5" /></>}
              </button>
            </>
          )}

          {step === "waiting" && (
            <div className="py-14 text-center">
              <Loader2 className="mx-auto h-16 w-16 animate-spin text-[#ff5b15]" />
              <h2 className="mt-7 text-2xl font-bold text-[#020b2d]">Waiting for Payment Confirmation</h2>
              <p className="mt-2 text-slate-500">
                {paymentInstructions
                  ? paymentInstructions
                  : selected?.channel === "MPESA"
                    ? `Approve the request sent to ${phone}.`
                    : "Complete payment in the secure provider window."}
              </p>
              <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-slate-200 bg-white p-5 text-left text-sm">
                <div className="flex justify-between"><span>Subscription plan</span><strong>{plan.displayName}</strong></div>
                <div className="mt-3 flex justify-between"><span>Amount</span><strong>{checkout?.currency} {checkout?.amount.toLocaleString()}</strong></div>
                <div className="mt-3 flex justify-between"><span>Invoice</span><strong>{checkout?.invoiceRef}</strong></div>
              </div>
              <p className="mt-6 text-sm text-slate-400">Confirmation is performed by the server. Closing this window will not cancel a completed provider payment.</p>
            </div>
          )}

          {step === "success" && (
            <div className="py-14 text-center">
              <CheckCircle2 className="mx-auto h-20 w-20 text-emerald-500" />
              <h2 className="mt-6 text-3xl font-bold text-[#020b2d]">Payment Successful!</h2>
              <p className="mt-2 text-slate-500">Your subscription has been activated automatically.</p>
              <div className="mx-auto mt-7 max-w-lg rounded-2xl border border-slate-200 bg-white p-5 text-left text-sm">
                <div className="flex justify-between"><span>Plan</span><strong>{plan.displayName}</strong></div>
                <div className="mt-3 flex justify-between"><span>Amount paid</span><strong>{plan.currency} {Number(plan.price).toLocaleString()}</strong></div>
                <div className="mt-3 flex justify-between"><span>Billing cycle</span><strong>{plan.billingCycle.replaceAll("_", " ")}</strong></div>
              </div>
              {plan.features?.length > 0 && (
                <div className="mx-auto mt-4 max-w-lg rounded-2xl bg-emerald-50 p-5 text-left text-sm text-emerald-900">
                  <strong className="mb-2 block">Features activated</strong>
                  {plan.features.filter(feature => feature.enabled).map(feature => (
                    <div key={feature.featureKey}>✓ {feature.featureKey.replaceAll("_", " ")}</div>
                  ))}
                </div>
              )}
              <button onClick={onClose} className="mx-auto mt-8 h-12 w-full max-w-lg rounded-lg bg-[#ff5b15] font-bold text-white">Continue to Dashboard</button>
            </div>
          )}

          {step === "failed" && (
            <div className="py-14 text-center">
              <AlertCircle className="mx-auto h-20 w-20 text-red-500" />
              <h2 className="mt-6 text-3xl font-bold text-[#020b2d]">Payment Could Not Start</h2>
              <p className="mx-auto mt-3 max-w-lg text-slate-500">{errorMessage}</p>
              <div className="mx-auto mt-8 flex max-w-lg gap-3">
                <button onClick={onClose} className="h-12 flex-1 rounded-lg border border-slate-300 font-bold text-slate-600">Close</button>
                <button onClick={() => setStep("method")} className="h-12 flex-1 rounded-lg bg-[#ff5b15] font-bold text-white">Try Again</button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
