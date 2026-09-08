"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, FileSignature, Home, Loader2, MailCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ActiveLease, listActiveLeases, listPendingTenantInvites, PendingTenantInvite, requestLeaseTermination } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Can from "@/components/auth/Can";
import { apiErrorMessage } from "@/lib/api-error";

type Envelope = { data?: ActiveLease[]; totalElements?: number; totalPages?: number };

export default function LeaseOperationsPage() {
  const token = useAuthStore(state => state.token);
  const role = useAuthStore(state => state.activeRole?.title);
  const workspace = useAuthStore(state => state.activeWorkspaceId);
  return <LeaseOperationsWorkspace key={`${token}:${role}:${workspace}`} />;
}

function LeaseOperationsWorkspace() {
  const token = useAuthStore((state) => state.token);
  const activeRole = useAuthStore((state) => state.activeRole);
  const [leases, setLeases] = useState<ActiveLease[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingTenantInvite[]>([]);
  const [inviteError, setInviteError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [terminating, setTerminating] = useState<number | null>(null);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const requestId = useRef(0);
  const isTenant = activeRole?.title?.toLowerCase() === "tenant";

  const load = useCallback(async () => {
    if (!token) return;
    const request = ++requestId.current;
    setLoading(true); setError(""); setInviteError(""); setLeases([]); setPendingInvites([]);
    try {
      const [leaseResult, inviteResult] = await Promise.allSettled([
        listActiveLeases(page, 25, token),
        isTenant ? listPendingTenantInvites(token) : Promise.resolve(null),
      ]);
      if (request !== requestId.current) return;
      if (leaseResult.status === "rejected") throw leaseResult.reason;
      const envelope = leaseResult.value.data as Envelope;
      setLeases(envelope.data ?? []);
      setTotalPages(envelope.totalPages ?? 0);
      if (inviteResult.status === "fulfilled" && inviteResult.value) {
        setPendingInvites(inviteResult.value.data.data ?? []);
      } else if (inviteResult.status === "rejected") {
        setInviteError(apiErrorMessage(inviteResult.reason, "Could not load pending invitations."));
      }
    } catch (error) {
      if (request === requestId.current) setError(apiErrorMessage(error, "Could not load leases. Please retry."));
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [token, page, isTenant]);

  useEffect(() => { void load(); return () => { requestId.current++; }; }, [load]);

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
    {isTenant && !loading && <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5" aria-labelledby="pending-invitations-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="rounded-full bg-white p-2 text-[#EF4217]"><MailCheck className="h-5 w-5" aria-hidden="true" /></span>
          <div><h2 id="pending-invitations-heading" className="font-semibold text-[#141130]">Pending unit invitations</h2><p className="text-sm text-muted-foreground">Assignments sent to your verified SlickHood email appear here—even if the email link is delayed or hidden.</p></div>
        </div>
        <Badge variant="outline" className="bg-white">{pendingInvites.length} pending</Badge>
      </div>
      {inviteError ? <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-white p-4 text-sm">{inviteError}<Button className="ml-3" size="sm" variant="outline" onClick={() => void load()}>Retry invitations</Button></div> : pendingInvites.length === 0 ?
        <p className="mt-4 rounded-xl border bg-white p-4 text-sm text-muted-foreground">No new unit invitations are waiting for this account.</p> :
        <div className="mt-4 grid gap-3 md:grid-cols-2">{pendingInvites.map(invite => <article key={invite.inviteId} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[#141130]">{invite.propertyName}</h3><p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Home className="h-4 w-4" aria-hidden="true" />Unit {invite.unitRef || `#${invite.unitId}`}</p></div><Badge>Invitation</Badge></div>
          <p className="mt-3 flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4 text-[#EF4217]" aria-hidden="true" />{invite.leaseStartDate} to {invite.leaseEndDate}</p>
          <Button asChild className="mt-4 w-full"><Link href={`/lease/initialize?token=${encodeURIComponent(invite.token)}`}>Review unit and continue</Link></Button>
        </article>)}</div>}
    </section>}
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-white p-5">{error}<Button variant="outline" onClick={() => void load()}>Retry leases</Button></div>}
    {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div> : !error && (leases.length === 0 ?
      <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">{isTenant && pendingInvites.length > 0 ? "Choose a pending invitation above to initialize its lease." : "No accessible leases."}</div> :
      <div className="grid gap-4">{leases.map((lease) => <div key={lease.id} className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><FileSignature className="mt-1 h-5 w-5 text-[#EF4217]" /><div><h2 className="font-semibold">{lease.name || `Lease #${lease.id}`}</h2><p className="text-sm text-muted-foreground">{lease.tenantName || "Tenant pending"}{lease.expiryDate ? ` · expires ${lease.expiryDate}` : ""}</p></div></div><Badge variant={lease.lifecycleStatus === "NOTICE_GIVEN" ? "destructive" : lease.signed ? "default" : "outline"}>{lease.lifecycleStatus || (lease.signed ? "ACTIVE" : "DRAFT")}</Badge></div>
        {lease.terminationEffectiveDate && <p className="mt-3 text-sm text-amber-700">Termination effective {lease.terminationEffectiveDate}</p>}
        {lease.firstRentDueDate && <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-950">
          <p><strong>Initial payment:</strong> first rent and any configured deposit were due {lease.firstRentDueDate}.</p>
          {lease.signed && lease.nextRentDueDate && <p className="mt-1">Next recurring rent date: <strong>{lease.nextRentDueDate}</strong>.</p>}
        </div>}
        {!lease.signed && <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2">
          <p className={lease.tenantSignDate ? "text-emerald-700" : "text-amber-700"}>Tenant signature: {lease.tenantSignDate ? "completed" : "pending"}</p>
          <p className={lease.ownerSignDate ? "text-emerald-700" : "text-amber-700"}>Landlord/manager signature: {lease.ownerSignDate ? `completed${lease.ownerSignName ? ` by ${lease.ownerSignName}` : ""}` : "pending"}</p>
        </div>}
        {!lease.signed && activeRole?.title?.toLowerCase() === "tenant" && (
          <p className={`mt-3 text-sm ${lease.agreementDocumentId ? "text-[#14235C]" : "text-amber-700"}`} role="status">
            {lease.agreementDocumentId
              ? lease.agreementStatus === "DRAFT"
                ? "Agreement preparation: the draft is available to review. Signing opens after the landlord or manager issues it."
                : "Agreement preparation: ready for your review and action."
              : "Agreement preparation: waiting for the landlord or manager to prepare the draft. You do not need to initialize the lease again."}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {!lease.signed && activeRole?.title?.toLowerCase() === "tenant" && lease.agreementDocumentId && <Button size="sm" asChild><Link href={`/dashboard/documents?leaseId=${lease.id}`}>{lease.agreementStatus === "DRAFT" ? "Review draft agreement" : "View and sign agreement"}</Link></Button>}
          {lease.signed && <Can permissions={["view_lease_document"]}><Button size="sm" variant="outline" asChild><Link href={`/dashboard/documents?leaseId=${lease.id}`}>View signed agreement</Link></Button></Can>}
          {!lease.signed && activeRole?.title?.toLowerCase() !== "tenant" && <Can permissions={["create_lease_document"]}><Button size="sm" asChild><Link href={`/dashboard/documents?leaseId=${lease.id}&type=RESIDENTIAL_LEASE_AGREEMENT`}>{lease.agreementDocumentId ? "Continue agreement" : "Prepare agreement"}</Link></Button></Can>}
          {lease.signed && (!lease.lifecycleStatus || lease.lifecycleStatus === "ACTIVE") && <Can permissions={["delete_lease"]}><Button size="sm" variant="outline" onClick={() => setTerminating(terminating === lease.id ? null : lease.id)}>Give termination notice</Button></Can>}
        </div>
        {terminating === lease.id && <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-[220px_1fr_auto]">
          <Input aria-label="Termination effective date" type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} />
          <Textarea aria-label="Termination reason" placeholder="Reason and move-out context" value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-10" />
          <Button onClick={() => void terminate(lease.id)} disabled={busy === lease.id || !effectiveDate || !reason.trim()}>Record notice</Button>
        </div>}
      </div>)}</div>)}
    {!error && totalPages > 1 && <div className="flex items-center justify-between"><Button variant="outline" disabled={loading || page === 0} onClick={() => setPage(p => p - 1)}>Previous leases</Button><span>Page {page + 1} of {totalPages}</span><Button variant="outline" disabled={loading || page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Next leases</Button></div>}
  </div>;
}
