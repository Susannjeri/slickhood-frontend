"use client";

import { usePathname } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

export type ProfileGateFields = Record<string, boolean>;

interface ProfileGateModalProps {
  open: boolean;
  fields: ProfileGateFields;
  onClose: () => void;
}

const toReadableLabel = (key: string): string =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());

export default function ProfileGateModal({ open, fields, onClose }: ProfileGateModalProps) {
  const pathname = usePathname();
  const verificationHref = `/kyc?returnTo=${encodeURIComponent(pathname)}`;

  const entries = Object.entries(fields);
  const missingCount = entries.filter(([, done]) => !done).length;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="p-0 border-0 overflow-hidden max-w-sm w-full rounded-2xl"
        style={{ boxShadow: "0 24px 60px rgba(20,17,48,0.15)" }}
      >
        {/* ── Top stripe ───────────────────────────── */}
        <div className="h-1 w-full" style={{ background: "#EF4217" }} />

        {/* ── Body ─────────────────────────────────── */}
        <div className="px-8 pt-8 pb-6 bg-white flex flex-col items-center text-center">

          {/* Icon circle */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
            style={{ background: "#fff4f1", border: "1.5px solid #fdddd8" }}
          >
            {/* clipboard icon drawn inline to avoid extra deps */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EF4217" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
          </div>

          <h2 className="text-lg font-bold mb-1" style={{ color: "#141130" }}>
            Complete Your Profile
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {missingCount === 1
              ? "1 field is missing. Please complete your profile to continue."
              : `${missingCount} fields are missing. Please complete your profile to continue.`}
          </p>
        </div>

        {/* ── Fields ───────────────────────────────── */}
        <div className="px-6 pb-2 bg-white space-y-2">
          {entries.map(([key, done]) => (
            <div
              key={key}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
              style={{
                background: done ? "#f6fef9" : "#fafafa",
                border: `1px solid ${done ? "#d1fae5" : "#f0f0f0"}`,
              }}
            >
              {done
                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                : <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#EF4217", opacity: 0.7 }} />
              }
              <span className="font-medium" style={{ color: "#141130" }}>
                {toReadableLabel(key)}
              </span>
              <span
                className="ml-auto text-xs font-semibold"
                style={{ color: done ? "#10b981" : "#EF4217" }}
              >
                {done ? "Done" : "Required"}
              </span>
            </div>
          ))}
        </div>

        {/* ── CTA ──────────────────────────────────── */}
        <div className="px-6 pt-4 pb-7 bg-white">
          <Button
            asChild
            className="w-full h-11 text-white font-semibold text-sm rounded-xl transition-opacity hover:opacity-90"
            style={{ background: "#EF4217" }}
          >
            <a href={verificationHref} onClick={onClose}>
              Complete Identity Verification
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
