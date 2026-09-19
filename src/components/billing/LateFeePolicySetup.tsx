"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { API } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type LateFeeBillingType = "RENTAL" | "SALE" | "SERVICE_CHARGE";
type Policy = {
  billingType: LateFeeBillingType;
  percentageRate: number;
  graceDays: number;
  maximumFee?: number | null;
  enabled: boolean;
  configured: boolean;
  effectiveFrom?: string | null;
};

const unwrapPolicy = (value: unknown): Policy | undefined => {
  const data = (value as { data?: unknown } | undefined)?.data;
  const policy = Array.isArray(data) ? data[0] : data;
  return policy && typeof policy === "object" ? policy as Policy : undefined;
};

export function LateFeePolicySetup({ billingType, compact = false, onReadyChange }: {
  billingType: LateFeeBillingType;
  compact?: boolean;
  onReadyChange?: (configured: boolean) => void;
}) {
  const [percentageRate, setPercentageRate] = useState("0");
  const [graceDays, setGraceDays] = useState("0");
  const [maximumFee, setMaximumFee] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void API.get(`/billing/late-fee-policy/${billingType}`)
      .then(response => {
        if (cancelled) return;
        const policy = unwrapPolicy(response.data);
        if (!policy) return;
        setPercentageRate(String(policy.percentageRate ?? 0));
        setGraceDays(String(policy.graceDays ?? 0));
        setMaximumFee(policy.maximumFee == null ? "" : String(policy.maximumFee));
        setEnabled(Boolean(policy.enabled));
        setEffectiveFrom(policy.effectiveFrom ?? null);
        onReadyChange?.(Boolean(policy.configured));
      })
      .catch(error => { if (!cancelled) toast.error(apiErrorMessage(error, "Late-fee settings could not be loaded.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [billingType, onReadyChange]);

  async function save() {
    const rate = Number(percentageRate), grace = Number(graceDays);
    const cap = maximumFee.trim() === "" ? null : Number(maximumFee);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error("Enter a late fee between 0% and 100%."); return;
    }
    if (!Number.isInteger(grace) || grace < 0 || grace > 365) {
      toast.error("Enter a grace period from 0 to 365 whole days."); return;
    }
    if (cap !== null && (!Number.isFinite(cap) || cap <= 0)) {
      toast.error("Enter a maximum fee above zero, or leave it blank for no cap."); return;
    }
    if (enabled && rate <= 0) {
      toast.error("Enter a percentage above 0, or switch the late fee off."); return;
    }
    setSaving(true);
    try {
      const response = await API.put(`/billing/late-fee-policy/${billingType}`, {
        percentageRate: rate, graceDays: grace, maximumFee: cap, enabled,
      });
      const saved = unwrapPolicy(response.data);
      if (!saved) throw new Error("The saved late-fee rule was not returned by the server.");
      setPercentageRate(String(saved.percentageRate ?? rate));
      setGraceDays(String(saved.graceDays ?? grace));
      setMaximumFee(saved.maximumFee == null ? "" : String(saved.maximumFee));
      setEnabled(Boolean(saved.enabled));
      setEffectiveFrom(saved?.effectiveFrom ?? effectiveFrom);
      onReadyChange?.(true);
      toast.success(enabled ? `Late fee saved at ${rate}%.` : "Late fees are switched off for this billing area.");
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Late-fee settings could not be saved."));
    } finally { setSaving(false); }
  }

  return <div className={compact ? "rounded-lg border bg-white p-4" : "rounded-xl border bg-white p-4"}>
    <p className="font-semibold">Late payment fee</p>
    <p className="mt-1 text-sm text-muted-foreground">Optional. Applied once to unpaid principal after the grace period; it never compounds on another late fee.</p>
    {effectiveFrom && <p className="mt-2 text-xs text-muted-foreground">Current rule applies prospectively to invoices due on or after {new Date(`${effectiveFrom}T00:00:00`).toLocaleDateString("en-KE", { dateStyle: "long" })}.</p>}
    {loading ? <p className="mt-3 text-sm text-muted-foreground">Loading late-fee settings…</p> : <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-1"><Label htmlFor={`late-fee-rate-${billingType}`}>Fee percentage</Label><div className="relative"><Input id={`late-fee-rate-${billingType}`} type="number" min="0" max="100" step="0.01" value={percentageRate} onChange={event => setPercentageRate(event.target.value)} className="pr-8"/><span className="absolute right-3 top-2 text-sm text-muted-foreground">%</span></div></div>
      <div className="space-y-1"><Label htmlFor={`late-fee-grace-${billingType}`}>Grace days</Label><Input id={`late-fee-grace-${billingType}`} type="number" min="0" max="365" step="1" value={graceDays} onChange={event => setGraceDays(event.target.value)}/></div>
      <div className="space-y-1"><Label htmlFor={`late-fee-cap-${billingType}`}>Maximum fee (optional)</Label><Input id={`late-fee-cap-${billingType}`} type="number" min="0.01" step="0.01" placeholder="No cap" value={maximumFee} onChange={event => setMaximumFee(event.target.value)}/><p className="text-xs text-muted-foreground">Applied in the same currency as the invoice.</p></div>
      <div className="flex items-end gap-2"><Button type="button" variant={enabled ? "default" : "outline"} aria-pressed={enabled} onClick={() => setEnabled(value => !value)}>{enabled ? "Fee on" : "Fee off"}</Button><Button type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></div>
    </div>}
  </div>;
}
