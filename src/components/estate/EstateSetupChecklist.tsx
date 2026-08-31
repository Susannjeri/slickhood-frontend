"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Check, Circle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiErrorMessage } from "@/lib/api-error";
import { estateSetupService, EstateSetupNextAction, EstateSetupStatus } from "@/services/estate-setup.service";

interface Props {
  propertyId: number;
  propertyName: string;
  currency: string;
  propertyType: string;
  onLinkAccount: () => void;
}

const actionCopy: Record<EstateSetupNextAction, { label: string; description: string }> = {
  ADD_UNITS: { label: "Add units", description: "Create the homes, apartments or spaces that belong to this property." },
  LINK_OPERATING_ACCOUNT: { label: "Link operating account", description: "Choose where rent, sale proceeds or service charges will be received." },
  ASSIGN_HOMEOWNERS: { label: "Assign homeowners", description: "Connect every occupied or sold unit to its current homeowner." },
  CREATE_ESTATE_BUDGET: { label: "Create annual budget", description: "Approve the current-year plan before raising estate service charges." },
  INVITE_ESTATE_TEAM: { label: "Invite estate team", description: "Give managers and operational staff only the access their roles require." },
  READY: { label: "Open estate operations", description: "Core setup is complete. Continue with meetings, budgets and common-area work." },
};

export default function EstateSetupChecklist({ propertyId, propertyName, currency, propertyType, onLinkAccount }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<EstateSetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await estateSetupService.status(propertyId);
      setStatus(response.data.data);
    } catch (requestError: unknown) {
      setError(apiErrorMessage(requestError, "Setup status could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { void load(); }, [load]);

  const steps = useMemo(() => {
    if (!status) return [];
    const serviceCharge = status.managementMode === "SERVICE_CHARGE";
    return [
      { key: "units", label: "Units", count: status.activeUnits, complete: status.unitsConfigured },
      { key: "account", label: "Operating account", count: status.operatingAccounts, complete: status.billingConfigured },
      ...(serviceCharge ? [
        { key: "homeowners", label: "Homeowner assignments", count: status.activeHomeowners, complete: status.activeHomeowners > 0 },
        { key: "budget", label: "Current-year budget", count: status.currentBudgets, complete: status.currentBudgets > 0 },
      ] : []),
      { key: "team", label: "Estate team", count: status.activeStaff, complete: status.activeStaff > 0, optional: true },
    ];
  }, [status]);

  function runNextAction(action: EstateSetupNextAction) {
    const nameSlug = propertyName.replace(/\s+/g, "-").toLowerCase();
    if (action === "ADD_UNITS") {
      const leaseMode = status?.managementMode === "RENTAL" ? "RENT" : status?.managementMode;
      router.push(`/dashboard/unit/create/${propertyId}?name=${encodeURIComponent(nameSlug)}&currency=${encodeURIComponent(currency)}&propertyType=${encodeURIComponent(propertyType)}&leaseMode=${leaseMode}&from=property`);
    } else if (action === "LINK_OPERATING_ACCOUNT") {
      onLinkAccount();
    } else if (action === "ASSIGN_HOMEOWNERS") {
      router.push(`/dashboard/homeowners?propertyId=${propertyId}`);
    } else if (action === "CREATE_ESTATE_BUDGET" || action === "READY") {
      router.push(`/dashboard/estate?propertyId=${propertyId}`);
    } else {
      router.push(`/dashboard/team-access?propertyId=${propertyId}`);
    }
  }

  if (loading) {
    return <Card aria-label="Estate setup"><CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Checking estate readiness…</CardContent></Card>;
  }

  if (error || !status) {
    return <Card className="border-amber-200"><CardContent className="flex flex-wrap items-center justify-between gap-3 py-5"><div className="flex items-center gap-2 text-sm text-amber-800"><AlertCircle className="h-5 w-5" />{error}</div><Button type="button" variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></CardContent></Card>;
  }

  const requiredSteps = steps.filter(step => !step.optional);
  const completed = requiredSteps.filter(step => step.complete).length;
  const progress = requiredSteps.length === 0 ? 100 : Math.round((completed / requiredSteps.length) * 100);
  const next = actionCopy[status.nextAction];

  return (
    <Card aria-label="Estate setup" className={status.readyForHomeownerOperations ? "border-emerald-200" : "border-orange-200"}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><CardTitle>Estate setup</CardTitle><CardDescription>Complete the operating foundation before day-to-day homeowner management.</CardDescription></div>
          <div className="text-right"><div className="text-2xl font-bold text-[#141130]">{progress}%</div><div className="text-xs text-muted-foreground">required setup</div></div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${progress}% complete`}><div className="h-full bg-[#EF4217] transition-all" style={{ width: `${progress}%` }} /></div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map(step => <div key={step.key} className="flex items-center gap-2 rounded-lg border bg-white p-3">{step.complete ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}<div><div className="text-sm font-medium">{step.label}{step.optional ? " (recommended)" : ""}</div><div className="text-xs text-muted-foreground">{step.count} active</div></div></div>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-4">
          <div><p className="font-semibold text-[#141130]">Next: {next.label}</p><p className="text-sm text-muted-foreground">{next.description}</p></div>
          <Button type="button" onClick={() => runNextAction(status.nextAction)}>{next.label}<ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}
