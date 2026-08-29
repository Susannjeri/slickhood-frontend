"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Download, FileKey2, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import {
  downloadMyPrivacyData,
  listMyPrivacyRequests,
  listPrivacyRequestsForReview,
  PrivacyRequestStatus,
  PrivacyRequestType,
  PrivacyRequestView,
  reviewPrivacyRequest,
  submitPrivacyRequest,
} from "@/services/privacy";

const nextStates: Partial<Record<PrivacyRequestStatus, PrivacyRequestStatus[]>> = {
  SUBMITTED: ["IN_REVIEW", "REJECTED"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["IN_PROGRESS", "COMPLETED"],
  IN_PROGRESS: ["COMPLETED", "REJECTED"],
};

const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase());
const date = (value?: string) => value ? new Date(value).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "—";
const errorMessage = (error: any, fallback: string) => error?.response?.data?.description ?? fallback;
const isSuperAdmin = (role?: string) => ["SUPER_ADMIN", "SUPERADMIN"].includes((role ?? "").replaceAll(" ", "_").toUpperCase());

interface ReviewDraft {
  status: PrivacyRequestStatus;
  reviewerNotes: string;
  legalHold: boolean;
  retentionBasis: string;
  resultReference: string;
}

export default function PrivacyPage() {
  const activeRole = useAuthStore(state => state.activeRole);
  const admin = isSuperAdmin(activeRole?.title);
  const [mine, setMine] = useState<PrivacyRequestView[]>([]);
  const [queue, setQueue] = useState<PrivacyRequestView[]>([]);
  const [type, setType] = useState<PrivacyRequestType>("ACCESS_EXPORT");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, ReviewDraft>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [myResponse, adminResponse] = await Promise.all([
        listMyPrivacyRequests(),
        admin ? listPrivacyRequestsForReview() : Promise.resolve(null),
      ]);
      setMine((myResponse.data?.data ?? []) as PrivacyRequestView[]);
      if (adminResponse) setQueue((adminResponse.data?.data ?? []) as PrivacyRequestView[]);
    } catch (error) {
      toast.error(errorMessage(error, "Privacy requests could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [admin]);

  useEffect(() => { void load(); }, [load]);

  const openRequest = useMemo(() => mine.find(item => item.type === type && !["REJECTED", "COMPLETED"].includes(item.status)), [mine, type]);

  const submit = async () => {
    if (reason.trim().length < 3) { toast.error("Tell us briefly why you are making this request."); return; }
    setBusy(true);
    try {
      await submitPrivacyRequest(type, reason.trim());
      toast.success(`${label(type)} request submitted.`);
      setReason("");
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "The request could not be submitted."));
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setBusy(true);
    try {
      const response = await downloadMyPrivacyData();
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `slickhood-personal-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Your portable data summary has been downloaded securely.");
    } catch (error) {
      toast.error(errorMessage(error, "Your data export could not be downloaded."));
    } finally {
      setBusy(false);
    }
  };

  const draftFor = (request: PrivacyRequestView): ReviewDraft => drafts[request.id] ?? {
    status: nextStates[request.status]?.[0] ?? request.status,
    reviewerNotes: "",
    legalHold: request.legalHold,
    retentionBasis: request.retentionBasis ?? "",
    resultReference: request.resultReference ?? "",
  };

  const updateDraft = (request: PrivacyRequestView, update: Partial<ReviewDraft>) =>
    setDrafts(current => ({ ...current, [request.id]: { ...draftFor(request), ...update } }));

  const review = async (request: PrivacyRequestView) => {
    const draft = draftFor(request);
    if (!draft.reviewerNotes.trim()) { toast.error("Reviewer notes are required for an auditable decision."); return; }
    if (draft.legalHold && !draft.retentionBasis.trim()) { toast.error("State the statutory or contractual retention basis."); return; }
    if (request.type === "ACCESS_EXPORT" && draft.status === "COMPLETED" && !draft.resultReference.trim()) {
      toast.error("Record the secure export or delivery reference before completion."); return;
    }
    setBusy(true);
    try {
      await reviewPrivacyRequest(request.id, draft);
      toast.success(`Request #${request.id} moved to ${label(draft.status)}.`);
      setDrafts(current => { const copy = { ...current }; delete copy[request.id]; return copy; });
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "The review decision could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1450px] space-y-6 p-4 sm:p-6">
      <section className="rounded-3xl bg-gradient-to-br from-[#10255c] to-[#071538] p-7 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-orange-300"><ShieldCheck className="h-4 w-4" /> Privacy centre</p>
            <h1 className="mt-2 text-3xl font-bold">Your information, under your control</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">Download a safe, portable account summary or submit a formal access or erasure request. Every request receives a due date and an auditable review.</p>
          </div>
          <Button onClick={() => void download()} disabled={busy} variant="secondary" className="gap-2"><Download className="h-4 w-4" /> Download my data</Button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader><CardTitle>Make a privacy request</CardTitle><CardDescription>Formal requests are tracked separately from the instant portable summary above.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <RequestType selected={type === "ACCESS_EXPORT"} icon={FileKey2} title="Access my data" detail="Ask for a reviewed copy or clarification of personal information." onClick={() => setType("ACCESS_EXPORT")} />
              <RequestType selected={type === "ERASURE"} icon={Trash2} title="Erase my account data" detail="Request deletion or anonymisation, subject to lawful retention duties." onClick={() => setType("ERASURE")} />
            </div>
            {type === "ERASURE" && <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><p>Erasure is not immediate. Payment, tax, fraud-prevention, legal-dispute, or other statutory records may need to be retained or anonymised. A reviewer will explain any legal hold.</p></div>}
            <label className="block space-y-2 text-sm font-semibold text-slate-700">Reason or scope
              <textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} rows={4} className="mt-2 w-full resize-y rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-[#ef4217]" placeholder="Tell the privacy team what you need…" />
            </label>
            <Button onClick={() => void submit()} disabled={busy || Boolean(openRequest)} className="bg-[#ef4217] hover:bg-[#d93a15]">{openRequest ? "An open request of this type already exists" : "Submit request"}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>What is protected</CardTitle><CardDescription>The portable export intentionally excludes secrets and sensitive storage internals.</CardDescription></CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <Protection text="Account profile, active roles, KYC metadata, and subscription history are included." />
            <Protection text="Passwords, refresh tokens, TOTP secrets, file paths, hashes, and encrypted OCR payloads are never exported." />
            <Protection text="Downloads use authenticated access and no-store response controls." />
            <Protection text="The request review records legal holds, retention grounds, reviewer notes, and delivery references." />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>My request history</CardTitle><CardDescription>Target response dates are parameterised; the current default is 30 days.</CardDescription></CardHeader>
        <CardContent>
          {loading ? <Loading /> : mine.length ? <div className="grid gap-3">{mine.map(request => <RequestSummary key={request.id} request={request} />)}</div> : <Empty text="You have not submitted a privacy request." />}
        </CardContent>
      </Card>

      {admin && <Card className="border-[#10255c]/20">
        <CardHeader><CardTitle>Privacy operations queue</CardTitle><CardDescription>Super administrators can advance requests only through the controlled workflow. Every decision is audited.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {queue.filter(item => nextStates[item.status]?.length).map(request => {
            const draft = draftFor(request);
            return <div key={request.id} className="rounded-2xl border p-4">
              <RequestSummary request={request} />
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">Next status<select value={draft.status} onChange={event => updateDraft(request, { status: event.target.value as PrivacyRequestStatus })} className="mt-1 w-full rounded-lg border p-2 text-sm">{nextStates[request.status]?.map(state => <option key={state} value={state}>{label(state)}</option>)}</select></label>
                <label className="text-xs font-semibold text-slate-600">Secure result reference<input value={draft.resultReference} onChange={event => updateDraft(request, { resultReference: event.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" placeholder="Vault or delivery reference" /></label>
                <label className="lg:col-span-2 text-xs font-semibold text-slate-600">Reviewer notes<textarea value={draft.reviewerNotes} onChange={event => updateDraft(request, { reviewerNotes: event.target.value })} rows={2} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.legalHold} onChange={event => updateDraft(request, { legalHold: event.target.checked })} /> Legal hold or retention duty applies</label>
                <input value={draft.retentionBasis} onChange={event => updateDraft(request, { retentionBasis: event.target.value })} disabled={!draft.legalHold} className="rounded-lg border p-2 text-sm disabled:bg-slate-50" placeholder="Retention basis (required for legal hold)" />
              </div>
              <Button onClick={() => void review(request)} disabled={busy} className="mt-3 bg-[#10255c] hover:bg-[#08183f]">Save audited decision</Button>
            </div>;
          })}
          {!queue.filter(item => nextStates[item.status]?.length).length && <Empty text="There are no open privacy requests to review." />}
        </CardContent>
      </Card>}
    </div>
  );
}

function RequestType({ selected, icon: Icon, title, detail, onClick }: { selected: boolean; icon: any; title: string; detail: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${selected ? "border-[#ef4217] bg-orange-50 ring-1 ring-[#ef4217]" : "hover:border-slate-300"}`}><Icon className={`h-5 w-5 ${selected ? "text-[#ef4217]" : "text-slate-500"}`} /><b className="mt-3 block text-slate-900">{title}</b><span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span></button>;
}

function RequestSummary({ request }: { request: PrivacyRequestView }) {
  const overdue = !["REJECTED", "COMPLETED"].includes(request.status) && new Date(request.dueAt) < new Date();
  return <div className="rounded-xl border bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">#{request.id} · {label(request.type)}</p><p className="mt-1 text-sm text-slate-500">{request.reason}</p></div><Status status={request.status} /></div>
    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500"><span>Submitted {date(request.submittedAt)}</span><span className={overdue ? "font-semibold text-red-600" : ""}>Due {date(request.dueAt)}</span>{request.reviewedAt && <span>Reviewed {date(request.reviewedAt)}</span>}</div>
    {request.legalHold && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><b>Retention duty:</b> {request.retentionBasis}</p>}
    {request.reviewerNotes && <p className="mt-3 text-xs text-slate-600"><b>Reviewer note:</b> {request.reviewerNotes}</p>}
  </div>;
}

function Status({ status }: { status: PrivacyRequestStatus }) {
  const done = status === "COMPLETED", rejected = status === "REJECTED";
  return <Badge variant="secondary" className={done ? "bg-emerald-50 text-emerald-700" : rejected ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}>{done ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <Clock3 className="mr-1 h-3 w-3" />}{label(status)}</Badge>;
}

function Protection({ text }: { text: string }) { return <div className="flex gap-3 rounded-xl bg-slate-50 p-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{text}</span></div>; }
function Loading() { return <div className="flex items-center justify-center py-10 text-sm text-slate-500"><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Loading privacy requests…</div>; }
function Empty({ text }: { text: string }) { return <p className="py-10 text-center text-sm text-slate-500">{text}</p>; }
