"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSignature, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ActiveLease, listActiveLeases, requestLeaseTermination, signLease } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Can from "@/components/auth/Can";

type Envelope = { data?: ActiveLease[]; totalElements?: number; totalPages?: number };

export default function LeaseOperationsPage() {
  const token = useAuthStore((state) => state.token);
  const [leases, setLeases] = useState<ActiveLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [terminating, setTerminating] = useState<number | null>(null);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await listActiveLeases(0, 100, token);
      const envelope = response.data as Envelope;
      setLeases(envelope.data ?? []);
    } catch {
      toast.error("Could not load leases");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const sign = async (leaseId: number) => {
    if (!token) return;
    setBusy(leaseId);
    try { await signLease(leaseId, token); toast.success("Lease signature recorded"); await load(); }
    catch { toast.error("The lease could not be signed"); }
    finally { setBusy(null); }
  };

  const terminate = async (leaseId: number) => {
    if (!token || !effectiveDate || !reason.trim()) return;
    setBusy(leaseId);
    try {
      await requestLeaseTermination(leaseId, { effectiveDate, reason: reason.trim() }, token);
      toast.success("Termination notice recorded");
      setTerminating(null); setEffectiveDate(""); setReason(""); await load();
    } catch { toast.error("Check the lease notice period and try again"); }
    finally { setBusy(null); }
  };

  return <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
    <Breadcrumb items={[{ label: "Lease operations" }]} />
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-[#141130]">Lease operations</h1><p className="text-sm text-muted-foreground">Drafts, signatures, active tenancies and controlled termination notices.</p></div>
      <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
    </div>
    {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div> : leases.length === 0 ?
      <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">No accessible leases.</div> :
      <div className="grid gap-4">{leases.map((lease) => <div key={lease.id} className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><FileSignature className="mt-1 h-5 w-5 text-[#EF4217]" /><div><h2 className="font-semibold">{lease.name || `Lease #${lease.id}`}</h2><p className="text-sm text-muted-foreground">{lease.tenantName || "Tenant pending"}{lease.expiryDate ? ` · expires ${lease.expiryDate}` : ""}</p></div></div><Badge variant={lease.lifecycleStatus === "NOTICE_GIVEN" ? "destructive" : lease.signed ? "default" : "outline"}>{lease.lifecycleStatus || (lease.signed ? "ACTIVE" : "DRAFT")}</Badge></div>
        {lease.terminationEffectiveDate && <p className="mt-3 text-sm text-amber-700">Termination effective {lease.terminationEffectiveDate}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {!lease.signed && <Can permissions={["sign_lease"]}><Button size="sm" onClick={() => void sign(lease.id)} disabled={busy === lease.id}>Sign lease</Button></Can>}
          {lease.signed && lease.lifecycleStatus !== "NOTICE_GIVEN" && <Can permissions={["delete_lease"]}><Button size="sm" variant="outline" onClick={() => setTerminating(terminating === lease.id ? null : lease.id)}>Give termination notice</Button></Can>}
        </div>
        {terminating === lease.id && <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-[220px_1fr_auto]">
          <Input aria-label="Termination effective date" type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} />
          <Textarea aria-label="Termination reason" placeholder="Reason and move-out context" value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-10" />
          <Button onClick={() => void terminate(lease.id)} disabled={busy === lease.id || !effectiveDate || !reason.trim()}>Record notice</Button>
        </div>}
      </div>)}</div>}
  </div>;
}
