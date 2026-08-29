"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, FileSearch, Loader2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KycAdminCase, listKycReviewQueue, reviewKyc } from "@/services/kyc.service";

const readable = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
const message = (error: unknown) => (error as { response?: { data?: { description?: string } } }).response?.data?.description ?? "The review could not be completed.";

export default function KycReviewPage() {
  const [rows, setRows] = useState<KycAdminCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number>();
  const load = useCallback(async () => { setLoading(true); try { setRows(await listKycReviewQueue()); } catch (error) { toast.error(message(error)); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);

  const decide = async (row: KycAdminCase, decision: "APPROVED" | "REJECTED") => {
    const notes = decision === "REJECTED" ? window.prompt("State exactly what the customer must correct")?.trim() : window.prompt("Optional internal review note")?.trim() ?? "";
    if (decision === "REJECTED" && !notes) return;
    setBusyId(row.kycCase.id ?? undefined);
    try { await reviewKyc(row.kycCase.id!, decision, notes ?? ""); toast.success(decision === "APPROVED" ? "Customer identity approved and account activated." : "Customer notified to correct their KYC submission."); await load(); }
    catch (error) { toast.error(message(error)); }
    finally { setBusyId(undefined); }
  };

  return <div className="space-y-6 px-3 py-6">
    <header className="flex flex-col justify-between gap-4 rounded-3xl bg-[#071744] p-7 text-white md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-orange-300">Controlled operations</p><h1 className="mt-2 text-3xl font-bold">Customer KYC review</h1><p className="mt-2 text-white/70">Approve only after comparing every required original document. Every decision is attributed to the reviewer.</p></div><Button variant="secondary" onClick={load} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh queue</Button></header>
    <div className="grid gap-4 md:grid-cols-3"><Metric label="Awaiting decision" value={rows.filter(row => ["SUBMITTED", "REVIEW_REQUIRED"].includes(row.kycCase.status)).length} icon={FileSearch} /><Metric label="Returned for correction" value={rows.filter(row => row.kycCase.status === "REJECTED").length} icon={ShieldAlert} /><Metric label="Queue total" value={rows.length} icon={CheckCircle2} /></div>
    {loading ? <div className="flex min-h-56 items-center justify-center text-slate-500"><Loader2 className="mr-2 h-6 w-6 animate-spin" />Loading review queue…</div> : rows.length === 0 ? <Card><CardContent className="py-20 text-center text-slate-500">No KYC cases are waiting for attention.</CardContent></Card> : rows.map(row => <Card key={row.kycCase.id} className="overflow-hidden"><CardHeader className="border-b bg-slate-50"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{row.fullName || "Unnamed customer"}</CardTitle><CardDescription>{row.email} · User #{row.userId}</CardDescription></div><Badge variant={row.kycCase.status === "REJECTED" ? "destructive" : "secondary"}>{readable(row.kycCase.status)}</Badge></div></CardHeader><CardContent className="space-y-5 p-5">
      {row.kycCase.reviewNotes && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><b>Previous decision:</b> {row.kycCase.reviewNotes}</div>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{row.kycCase.documents.map(document => <a key={document.id} href={document.downloadUrl} target="_blank" rel="noreferrer" className="rounded-xl border p-4 transition hover:border-[#EF4217] hover:bg-orange-50"><div className="flex items-start justify-between"><b>{readable(document.documentType)}</b><ExternalLink className="h-4 w-4 text-slate-400" /></div><p className="mt-2 text-xs text-slate-500">{readable(document.status)} · quality {document.qualityScore?.toFixed(1) ?? "checked"}</p>{Object.keys(document.extractedFields ?? {}).length > 0 && <p className="mt-2 text-xs text-emerald-700">Extracted fields available for comparison</p>}</a>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-sm text-slate-500">Phone {row.kycCase.phoneVerified ? "verified" : "not verified"} · {row.kycCase.missingRequirementCodes.length} missing requirements</p>{row.kycCase.status !== "REJECTED" && <div className="flex gap-2"><Button variant="destructive" disabled={busyId === row.kycCase.id} onClick={() => decide(row, "REJECTED")}><XCircle className="mr-2 h-4 w-4" />Return for correction</Button><Button className="bg-emerald-600 hover:bg-emerald-700" disabled={busyId === row.kycCase.id || !row.kycCase.phoneVerified || row.kycCase.missingRequirementCodes.length > 0} onClick={() => decide(row, "APPROVED")}><CheckCircle2 className="mr-2 h-4 w-4" />Approve and activate</Button></div>}</div>
    </CardContent></Card>)}
  </div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof FileSearch }) { return <Card><CardContent className="flex items-center gap-4 pt-5"><div className="rounded-xl bg-orange-50 p-3 text-[#EF4217]"><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-bold text-[#071744]">{value}</p><p className="text-sm text-slate-500">{label}</p></div></CardContent></Card>; }
