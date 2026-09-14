"use client";

import Link from "next/link";
import { CalendarClock, CircleDollarSign, ShieldCheck } from "lucide-react";
import { LateFeePolicySetup, type LateFeeBillingType } from "@/components/billing/LateFeePolicySetup";
import { BillingNavigation } from "@/components/invoices/BillingNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";

const policyByRole: Record<string, { type: LateFeeBillingType; label: string; dueSetup: string }> = {
  Landlord: { type: "RENTAL", label: "Rental invoices", dueSetup: "/dashboard/lease/templates" },
  EstateManager: { type: "SERVICE_CHARGE", label: "Estate service charges", dueSetup: "/dashboard/estate" },
  SalesAgent: { type: "SALE", label: "Property-sale invoices", dueSetup: "/dashboard/sales" },
};

export default function LatePaymentSettingsPage() {
  const role = useAuthStore(state => state.activeRole?.title);
  const policy = role ? policyByRole[role] : undefined;

  return <main className="mx-auto w-full max-w-[1200px] space-y-6 p-4 sm:p-6">
    <BillingNavigation />
    <div>
      <h1 className="flex items-center gap-2 text-3xl font-bold text-[#08184a] dark:text-white">
        <CalendarClock className="h-7 w-7 text-[#ef4217]" /> Late-payment settings
      </h1>
      <p className="mt-2 text-sm text-slate-500">Control when a one-time fee is added to an overdue customer invoice.</p>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-[#ef4217]" />When is a payment late?</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-600"><p>An unpaid or partly paid invoice becomes <strong>overdue on the day after its due date</strong>.</p><p>The grace period does not change the overdue label. It postpones only the late fee.</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" />Safe fee assessment</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-600"><p>The percentage is calculated once on the unpaid balance after the grace period. A fee is never charged on another late fee.</p><p>Saving a rule starts it from today; it cannot create fees on older overdue invoices.</p></CardContent></Card>
    </div>

    {policy ? <Card className="border-orange-200"><CardHeader><CardTitle>{policy.label}</CardTitle><CardDescription>Configure the rule for the active {role} workspace. Customer reminders continue every seven days while a balance remains overdue.</CardDescription></CardHeader><CardContent className="space-y-4"><LateFeePolicySetup billingType={policy.type} /><div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-white/5"><p><strong>Due dates are set separately.</strong> The invoice due date determines when payment becomes overdue.</p><Button asChild variant="link" className="mt-1 h-auto p-0"><Link href={policy.dueSetup}>Review due-date setup</Link></Button></div></CardContent></Card>
      : <Card><CardHeader><CardTitle>Account-owner setting</CardTitle><CardDescription>Switch to a Landlord, Estate Management or Property Sale Management profile to configure that workspace’s late-payment rule.</CardDescription></CardHeader></Card>}
  </main>;
}
