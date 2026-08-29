"use client";
import { useState } from "react";
import { Invoice } from "@/types/invoice";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface Props {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

interface FormState {
  amount: string;
  channel: string;
  transId: string;
  transactionDate: string;
}

const EMPTY: FormState = { amount: "", channel: "", transId: "", transactionDate: "" };

export function ManualPaymentModal({ invoice, open, onClose, onPaymentSuccess }: Props) {
  const { handleManualPaymentRecord } = useApi();

  const [form, setForm]       = useState<FormState>(EMPTY);
  const [errors, setErrors]   = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error on change
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const next: Partial<FormState> = {};
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      next.amount = "Enter a valid amount greater than 0.";
    if (!form.channel.trim())
      next.channel = "Payment channel is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await handleManualPaymentRecord(
        invoice.ref,
        Number(form.amount),
        form.channel.trim(),
        form.transId.trim() || undefined,
        form.transactionDate || undefined,
      );
      if (res?.success) {
        toast.success(res.description ?? "Payment recorded successfully.");
        onPaymentSuccess();
        handleClose();
      } else {
        toast.error(res?.description ?? "Failed to record payment.");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.description ?? "Failed to record payment. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm(EMPTY);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] rounded-2xl p-0 overflow-hidden">

        {/* Header */}
        <DialogHeader className="border-b border-gray-100 px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
          <DialogTitle className="text-base text-[#141130]">Record Manual Payment</DialogTitle>
          <p className="text-xs text-gray-400 mt-0.5">
            Invoice <span className="font-semibold text-[#EF4217]">{invoice.ref}</span>
            {" · "}
            <span className="font-semibold text-[#141130]">
              Due {invoice.currency} {invoice.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </p>
        </DialogHeader>

        {/* Form */}
        <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-gray-600">
              Amount <span className="text-[#EF4217]">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                {invoice.currency}
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={set("amount")}
                placeholder={invoice.amount.toFixed(2)}
                className={`pl-12 h-9 text-sm ${errors.amount ? "border-red-400 focus-visible:ring-red-400" : ""}`}
              />
            </div>
            {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
          </div>

          {/* Channel */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-gray-600">
              Payment Channel <span className="text-[#EF4217]">*</span>
            </Label>
            <Input
              value={form.channel}
              onChange={set("channel")}
              placeholder="e.g. Bank Transfer, Cash, Cheque..."
              className={`h-9 text-sm ${errors.channel ? "border-red-400 focus-visible:ring-red-400" : ""}`}
            />
            {errors.channel && <p className="text-xs text-red-500">{errors.channel}</p>}
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-gray-600">
                Transaction ID <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                value={form.transId}
                onChange={set("transId")}
                placeholder="e.g. TXN123456"
                className="h-9 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-gray-600">
                Transaction Date <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                type="date"
                value={form.transactionDate}
                onChange={set("transactionDate")}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Summary box */}
          {form.amount && !isNaN(Number(form.amount)) && Number(form.amount) > 0 && (
            <div className="rounded-xl bg-[#FEF3F0] border border-[#FDDDD6] p-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">Recording payment of</span>
              <span className="text-sm font-bold text-[#EF4217]">
                {invoice.currency} {Number(form.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1 h-10"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-10 bg-[#EF4217] hover:bg-[#d63a13] text-white"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : "Record Payment"
              }
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
