"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

// ── Policy content ────────────────────────────────────────────────────────────

const POLICIES = [
  {
    id: "terms",
    short: "T&C",
    title: "Terms & conditions",
    checkLabel: "I have read and agree to the Terms & Conditions.",
    content: `By using SlickHood PMS you agree to comply with all applicable Kenyan laws, including the Data Protection Act, 2019. You must be 18 years or older and legally capable of entering a binding agreement. Businesses must be duly registered.

You agree to: provide accurate information; use the system for lawful purposes only; not misuse, hack, or interfere with platform functionality.

We reserve the right to suspend or terminate accounts that violate these Terms upon 14 days' written notice. You may terminate your subscription with 30 days' written notice.

Our aggregate liability is limited to the amount paid for service within the last 12 months. SlickHood is provided "as is" — we are not liable for loss of revenue, loss of data caused by user negligence, or third-party system failures.`,
  },
  {
    id: "privacy",
    short: "Privacy",
    title: "Privacy policy",
    checkLabel: "I have read and agree to the Privacy Policy.",
    content: `SlickHood PMS collects user account details, property details, tenant details, payment records, and usage logs strictly to provide and improve the platform.

We do not sell personal data. Data is shared only with payment service providers, cloud hosting partners, and legal authorities when required by law.

You have the right to access your data (within 30 days), correct inaccurate information (within 14 days), and request deletion (within 30 days). Requests: privacy@silveroceangroup.org.

Data is retained as long as your account is active or as required by law. All data is processed in accordance with the Kenya Data Protection Act, 2019.`,
  },
  {
    id: "aup",
    short: "AUP",
    title: "Acceptable use",
    checkLabel: "I have read and agree to the Acceptable Use Policy.",
    content: `You must not attempt to access accounts or systems without permission, use the platform for unlawful or fraudulent purposes, collect or distribute personal data of others without consent, upload malware or harmful code, overload or disrupt platform performance, or misrepresent yourself or SlickHood.

You must protect your login credentials, provide accurate information, and report security vulnerabilities or suspicious activity immediately.

Violations may result in account suspension, termination, forfeiture of credits, or legal action.`,
  },
  {
    id: "data",
    short: "Data",
    title: "Data protection",
    checkLabel: "I have read and agree to the Data Protection & Privacy Policy.",
    content: `SlickHood PMS processes personal data based on your consent, contractual necessity, legal compliance, and legitimate business interest.

Data collected includes identification data, contact information, property and tenancy records, financial transaction data, and system usage logs. This data is used strictly for account management, property management functions, billing, communications, security, and platform improvement.

We implement secure cloud infrastructure, encrypted data transmission, role-based access controls, and continuous monitoring. You bear responsibility for safeguarding your account credentials.

In the event of a data breach, affected parties will be notified as required by Kenyan law. Contact: privacy@silveroceangroup.org.`,
  },
  {
    id: "age",
    short: "Age",
    title: "Age confirmation",
    checkLabel: "I confirm I am 18 years or older and legally capable of entering a binding agreement.",
    content: `You confirm that you are 18 years of age or older and are legally capable of entering into a binding agreement under the laws of Kenya.

If you are registering on behalf of a business or organization, you confirm that you have the authority to bind that entity to these terms.

SlickHood PMS does not knowingly collect data from persons under the age of 18. If we become aware that a minor has registered, the account will be suspended pending verification.`,
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface TermsAcceptanceProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TermsAcceptance({ open, onAccept, onDecline }: TermsAcceptanceProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const confirmedCount = POLICIES.filter((p) => checked[p.id]).length;
  const allChecked = confirmedCount === POLICIES.length;
  const active = POLICIES[activeTab];

  const toggle = (id: string, val: boolean) =>
    setChecked((prev) => ({ ...prev, [id]: val }));

  const handleDecline = () => {
    setChecked({});
    setActiveTab(0);
    onDecline();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDecline(); }}>
      <DialogContent
        className="max-w-lg w-[calc(100vw-32px)] p-0 gap-0 flex flex-col h-[90dvh] max-h-[580px] sm:h-[580px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#EF4217]/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-[#EF4217]" />
            </div>
            <DialogTitle className="text-[15px] font-medium text-gray-900">
              Review &amp; accept our policies
            </DialogTitle>
          </div>
          <DialogDescription className="text-[13px] text-gray-500 leading-relaxed">
            Read each policy then check the box to confirm. All are required to create your account.
          </DialogDescription>
        </DialogHeader>

        {/* ── Tabs ── */}
        <div className="flex border-b px-6 shrink-0 overflow-x-auto scrollbar-hide">
          {POLICIES.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveTab(i)}
              className={cn(
                "flex items-center gap-1.5 text-xs py-2.5 mr-5 border-b-2 transition-colors whitespace-nowrap shrink-0",
                i === activeTab
                  ? "border-[#EF4217] text-[#EF4217] font-medium"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              )}
            >
              {/* Status dot */}
              <span className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                checked[p.id] ? "bg-green-500" : "bg-gray-200"
              )} />
              {p.short}
            </button>
          ))}
        </div>

        {/* ── Policy body — fixed height, internal scroll ── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-5">
            <p className="text-[13px] font-medium text-gray-700 mb-3">{active.title}</p>
            <p className="text-[13px] text-gray-500 leading-relaxed whitespace-pre-line">
              {active.content}
            </p>
          </div>
        </ScrollArea>

        {/* ── Per-policy checkbox ── */}
        <div className="px-6 py-3.5 border-t shrink-0">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id={`chk-${active.id}`}
              checked={!!checked[active.id]}
              onCheckedChange={(val) => toggle(active.id, !!val)}
              className="mt-0.5 data-[state=checked]:bg-[#EF4217] data-[state=checked]:border-[#EF4217]"
            />
            <Label
              htmlFor={`chk-${active.id}`}
              className="text-[13px] text-gray-600 leading-snug cursor-pointer"
            >
              {active.checkLabel}
            </Label>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 pb-5 pt-3 border-t shrink-0">
          {/* Progress */}
          <div className="flex justify-between text-[11px] text-gray-400 mb-1.5">
            <span>{confirmedCount} of {POLICIES.length} confirmed</span>
            {allChecked && <span className="text-green-600 font-medium">All confirmed</span>}
          </div>
          <div className="h-0.5 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-[#EF4217] rounded-full transition-all duration-300"
              style={{ width: `${(confirmedCount / POLICIES.length) * 100}%` }}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl text-gray-600 text-[13px]"
              onClick={handleDecline}
            >
              Decline
            </Button>
            <Button
              type="button"
              disabled={!allChecked}
              onClick={onAccept}
              className="flex-1 bg-[#EF4217] hover:bg-[#d63600] text-white rounded-xl text-[13px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Accept &amp; continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}