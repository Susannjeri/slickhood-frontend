"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, FileCheck2, Loader2, LockKeyhole, Phone, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { getCurrentKyc, KycCase, KycRequirement, startKyc, submitKyc, uploadKycDocument } from "@/services/kyc.service";
import { KycDocumentViewer } from "@/components/auth/KycDocumentViewer";
import { resolveOnboardingContinuation } from "@/services/onboarding-continuation.service";
import { updateContact, verifyContact } from "@/lib/api";
import { MAX_KYC_FILE_LABEL, prepareKycUpload } from "@/lib/kyc-upload";

const label = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
const errorMessage = (error: unknown, fallback: string) => {
  const candidate = error as { response?: { data?: { description?: string } } };
  return candidate.response?.data?.description ?? (error instanceof Error ? error.message : fallback);
};

export default function KycPage() {
  const router = useRouter();
  const [profileRemediation, setProfileRemediation] = useState(false);
  const token = useAuthStore(state => state.token);
  const activeRole = useAuthStore(state => state.activeRole);
  const sessionReady = useAuthStore(state => state.sessionReady);
  const [kyc, setKyc] = useState<KycCase>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [changingPhone, setChangingPhone] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [phoneVerificationMessage, setPhoneVerificationMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const current = await getCurrentKyc();
      setKyc(current);
      if (current.verifiedPhoneNumber) setPhone(current.verifiedPhoneNumber);
    }
    catch (error) { toast.error(errorMessage(error, "Identity verification could not be loaded.")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setProfileRemediation(new URLSearchParams(window.location.search).get("remediate") === "profile");
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    if (!token) router.replace("/login");
    else void load();
  }, [load, router, sessionReady, token]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const missing = useMemo(() => new Set(kyc?.missingRequirementCodes ?? []), [kyc]);
  const waiting = kyc?.status === "SUBMITTED" || kyc?.status === "REVIEW_REQUIRED";

  const begin = async () => {
    if (!kyc || !consent) return;
    setBusy(true);
    try { setKyc(await startKyc(kyc.consentVersion)); toast.success("Secure identity verification started."); }
    catch (error) { toast.error(errorMessage(error, "Identity verification could not be started.")); }
    finally { setBusy(false); }
  };

  const sendPhoneCode = async (resending = false) => {
    if (!token || !phone.trim()) return;
    setBusy(true);
    try { await verifyContact({ contact: phone.trim(), channel: "SMS", token }); setCodeSent(true); setResendCooldown(60); toast.success(resending ? "A new verification code was sent." : "A verification code was sent to your phone."); }
    catch (error) { toast.error(errorMessage(error, "The verification code could not be sent.")); }
    finally { setBusy(false); }
  };

  const confirmPhone = async () => {
    if (!token || !phoneCode.trim()) return;
    setBusy(true);
    try {
      await updateContact(phoneCode.trim(), token);
      const verifiedAt = new Date().toISOString();
      setKyc(current => current ? { ...current, phoneVerified: true, verifiedPhoneNumber: phone.trim(), phoneVerifiedAt: verifiedAt } : current);
      setPhoneCode("");
      setCodeSent(false);
      setChangingPhone(false);
      setPhoneVerificationMessage("Your phone number has been verified successfully. You can continue with your documents.");
      toast.success("Phone number verified and locked.");
      try {
        const confirmed = await getCurrentKyc();
        if (confirmed.phoneVerified) setKyc(confirmed);
      } catch {
        // The successful confirmation response is authoritative; refresh can reconcile later.
      }
    }
    catch (error) { toast.error(errorMessage(error, "The code is invalid or has expired.")); }
    finally { setBusy(false); }
  };

  const finish = async () => {
    setBusy(true);
    try { setKyc(await submitKyc()); toast.success("Identity verification submitted for review."); }
    catch (error) { toast.error(errorMessage(error, "Identity verification could not be submitted.")); }
    finally { setBusy(false); }
  };

  const continueSetup = async () => {
    if (!token) return;
    const next = await resolveOnboardingContinuation(token, activeRole);
    router.replace(next.destination);
  };

  const reopenVerification = async () => {
    if (!kyc) return;
    setBusy(true);
    try {
      setKyc(await startKyc(kyc.consentVersion));
      toast.success("Identity verification reopened. Upload the requested clear documents.");
    } catch (error) {
      toast.error(errorMessage(error, "Identity verification could not be reopened."));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !kyc) return <Loading />;
  if (kyc.status === "APPROVED" && kyc.accountStatus === "ACTIVE") {
    if (profileRemediation) return <StateCard icon="waiting" title="Additional identity details required" text="Your account is active, but a legacy profile check is missing verified identity details. Reopen verification and upload the requested clear documents; manual entry remains disabled." action="Reopen secure verification" onAction={reopenVerification} />;
    return <StateCard icon="approved" title="Identity verified" text="Your account is approved. Continue to choose your plan or enter your assigned workspace." action="Continue setup" onAction={continueSetup} />;
  }
  if (waiting) return <StateCard icon="waiting" title="Verification under review" text="Your documents were submitted securely. You can leave this page and return later; we will preserve your progress." action="Check status" onAction={load} />;

  const needsStart = kyc.status === "NOT_STARTED" || kyc.status === "REJECTED" || kyc.status === "EXPIRED";
  return <main className="min-h-screen bg-[#F4F6FB] px-4 py-8 text-[#071744] sm:px-8"><Toaster position="top-center" /><div className="mx-auto max-w-5xl">
    <header className="mb-6 flex items-center justify-between"><div className="text-xl font-bold">Slick<span className="text-[#EF4217]">Hood</span></div><div className="flex items-center gap-2 text-sm text-slate-500"><LockKeyhole className="h-4 w-4" />Secure verification</div></header>
    <section className="overflow-hidden rounded-[28px] border bg-white shadow-xl shadow-slate-200/60">
      <div className="bg-[#071744] px-7 py-8 text-white sm:px-10"><div className="flex items-start gap-4"><div className="rounded-2xl bg-[#EF4217] p-3"><ShieldCheck className="h-7 w-7" /></div><div><p className="text-xs font-bold uppercase tracking-[.2em] text-orange-300">Customer KYC</p><h1 className="mt-1 text-3xl font-bold">Verify your identity</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Upload clear original documents. Manual entry of identity numbers is disabled to protect your account and other SlickHood users.</p></div></div></div>
      <div className="space-y-7 p-6 sm:p-10">
        {kyc.status === "REJECTED" && <Notice tone="error" title="Changes are required" text={kyc.reviewNotes || "Review the feedback and upload new, clear documents."} />}
        {needsStart ? <div className="rounded-2xl border border-slate-200 p-6"><h2 className="text-lg font-bold">Consent and privacy</h2><p className="mt-2 text-sm leading-6 text-slate-600">I consent to SlickHood processing the identity documents I provide for account verification, fraud prevention, regulatory compliance and service security. Access is restricted to authorised reviewers and recorded in the audit log.</p><label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm"><input className="mt-1 h-4 w-4" type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>I have read and accept the identity-verification privacy notice, version {kyc.consentVersion}.</span></label><Button className="mt-5 bg-[#EF4217] hover:bg-[#d93a13]" disabled={!consent || busy} onClick={begin}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Start verification</Button></div> : <>
          {phoneVerificationMessage && <Notice tone="success" title="Phone verified" text={phoneVerificationMessage} />}
          <PhoneVerification verified={kyc.phoneVerified} verifiedAt={kyc.phoneVerifiedAt} changing={changingPhone} beginChange={() => { setChangingPhone(true); setPhone(""); setCodeSent(false); setPhoneCode(""); setResendCooldown(0); }} phone={phone} setPhone={setPhone} code={phoneCode} setCode={setPhoneCode} codeSent={codeSent} busy={busy} resendCooldown={resendCooldown} send={() => void sendPhoneCode(false)} resend={() => void sendPhoneCode(true)} edit={() => { setCodeSent(false); setPhoneCode(""); setResendCooldown(0); }} confirm={confirmPhone} />
          <section><div className="mb-4"><h2 className="text-xl font-bold">Required documents</h2><p className="mt-1 text-sm text-slate-500">Requirements are combined safely across all roles currently assigned to your account.</p></div><div className="grid gap-4 md:grid-cols-2">{kyc.requirements.map(requirement => <RequirementCard key={requirement.code} requirement={requirement} kyc={kyc} missing={missing.has(requirement.code)} onUploaded={load} />)}</div></section>
          <div className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-50 p-5 sm:flex-row sm:items-center"><div><p className="font-bold">Ready for review?</p><p className="text-sm text-slate-500">{missing.size ? `${missing.size} required item${missing.size === 1 ? "" : "s"} remaining.` : kyc.phoneVerified ? "All required items are ready." : "Verify your phone number first."}</p></div><Button className="bg-[#EF4217] hover:bg-[#d93a13]" disabled={busy || missing.size > 0 || !kyc.phoneVerified} onClick={finish}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit for review <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
        </>}
      </div>
    </section>
  </div></main>;
}

function RequirementCard({ requirement, kyc, missing, onUploaded }: { requirement: KycRequirement; kyc: KycCase; missing: boolean; onUploaded: () => Promise<void> }) {
  const [type, setType] = useState(requirement.acceptedTypes[0]); const [uploading, setUploading] = useState(false);
  const document = kyc.documents.find(item => requirement.acceptedTypes.includes(item.documentType) && item.status !== "REJECTED");
  const upload = async (event: ChangeEvent<HTMLInputElement>) => { const selected = event.target.files?.[0]; if (!selected) return; setUploading(true); try { const prepared = await prepareKycUpload(selected); if (prepared.optimized) toast.info("Large photo optimized securely before upload."); await uploadKycDocument(type, prepared.file); toast.success(`${requirement.label} uploaded and checked.`); await onUploaded(); } catch (error) { toast.error(errorMessage(error, `The document could not be uploaded. Use a clear JPG, PNG or PDF up to ${MAX_KYC_FILE_LABEL}.`)); } finally { event.target.value = ""; setUploading(false); } };
  return <article className={`rounded-2xl border p-5 ${document ? "border-emerald-200 bg-emerald-50/40" : missing ? "border-orange-200" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{requirement.label}</h3><p className="mt-1 text-xs text-slate-500">{requirement.required ? "Required" : "Optional"}</p></div>{document ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <Upload className="h-5 w-5 text-slate-400" />}</div>{document ? <div className="mt-4 rounded-xl bg-white p-3 text-sm"><p className="font-semibold">{label(document.documentType)}</p><p className="text-xs text-slate-500">{label(document.status)} · {new Date(document.uploadedAt).toLocaleString()}</p><KycDocumentViewer document={document} className="mt-3 w-full" /></div> : <div className="mt-4 space-y-3"><select className="w-full rounded-xl border bg-white p-3 text-sm" value={type} onChange={event => setType(event.target.value)}>{requirement.acceptedTypes.map(value => <option key={value} value={value}>{label(value)}</option>)}</select><label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-[#EF4217] hover:border-[#EF4217]">{uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Choose clear document<input className="sr-only" type="file" accept="image/jpeg,image/png,application/pdf" capture={type === "SELFIE" ? "user" : undefined} disabled={uploading} onChange={upload} /></label><p className="text-center text-xs text-slate-500">JPG, PNG or PDF · maximum {MAX_KYC_FILE_LABEL}. Large photos are optimized automatically.</p></div>}</article>;
}

function PhoneVerification({ verified, verifiedAt, changing, beginChange, phone, setPhone, code, setCode, codeSent, busy, resendCooldown, send, resend, edit, confirm }: { verified: boolean; verifiedAt?: string; changing: boolean; beginChange: () => void; phone: string; setPhone: (value: string) => void; code: string; setCode: (value: string) => void; codeSent: boolean; busy: boolean; resendCooldown: number; send: () => void; resend: () => void; edit: () => void; confirm: () => void }) {
  if (verified && !changing) return <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" /><div><h2 className="font-bold text-emerald-900">Phone number verified</h2><p className="mt-1 font-mono text-sm text-emerald-900">{phone || "Verified contact"}</p><p className="mt-1 text-xs text-emerald-700">Verified by SMS{verifiedAt ? ` on ${new Date(verifiedAt).toLocaleString()}` : ""}. This field is locked.</p></div></div><Button type="button" variant="outline" onClick={beginChange}>Change verified number</Button></div></section>;
  return <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5"><div className="flex gap-3"><Phone className="mt-0.5 h-5 w-5 text-blue-700" /><div className="flex-1"><h2 className="font-bold">Verify your phone number</h2><p className="mt-1 text-sm text-slate-600">Use a number you control. Enter it in international format, for example +2547XXXXXXXX or +2541XXXXXXXX.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><Input value={phone} onChange={event => setPhone(event.target.value)} placeholder="+2547XXXXXXXX" disabled={codeSent || busy} />{!codeSent && <Button variant="outline" disabled={busy || !phone.trim()} onClick={send}>Send code</Button>}{codeSent && <><Input value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="Verification code" maxLength={8} /><Button disabled={busy || !code.trim()} onClick={confirm}>Confirm phone</Button></>}</div>{codeSent && <div className="mt-3 flex flex-wrap items-center gap-4 text-sm"><button type="button" className="font-semibold text-[#EF4217] disabled:cursor-not-allowed disabled:text-slate-400" disabled={busy || resendCooldown > 0} onClick={resend}>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}</button><button type="button" className="font-semibold text-blue-700 disabled:text-slate-400" disabled={busy} onClick={edit}>Use a different number</button></div>}</div></div></section>;
}

function Notice({ tone, title, text }: { tone: "success" | "error"; title: string; text: string }) { const Icon = tone === "success" ? CheckCircle2 : AlertCircle; return <div className={`flex gap-3 rounded-2xl border p-5 ${tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}><Icon className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">{title}</p><p className="mt-1 text-sm opacity-80">{text}</p></div></div>; }
function StateCard({ icon, title, text, action, onAction }: { icon: "approved" | "waiting"; title: string; text: string; action: string; onAction: () => void | Promise<void> }) { const Icon = icon === "approved" ? FileCheck2 : RefreshCw; return <main className="flex min-h-screen items-center justify-center bg-[#F4F6FB] p-5"><Toaster position="top-center" /><section className="w-full max-w-xl rounded-[28px] border bg-white p-10 text-center shadow-xl"><div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${icon === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-[#EF4217]"}`}><Icon className={`h-9 w-9 ${icon === "waiting" ? "animate-spin [animation-duration:3s]" : ""}`} /></div><h1 className="mt-6 text-3xl font-bold text-[#071744]">{title}</h1><p className="mt-3 leading-7 text-slate-600">{text}</p><Button className="mt-7 bg-[#EF4217] hover:bg-[#d93a13]" onClick={onAction}>{action}</Button></section></main>; }
function Loading() { return <main className="flex min-h-screen items-center justify-center bg-[#F4F6FB] text-slate-500"><Loader2 className="mr-3 h-7 w-7 animate-spin text-[#EF4217]" />Loading secure verification…</main>; }
