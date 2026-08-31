"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EstateOperationsPanel } from "@/components/estate/EstateOperationsPanel";
import { fetchUnitList } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { estateService } from "@/services/business-workflows.service";
import { useAuthStore } from "@/store/authStore";
import { EstateServiceCharge, PropertyOwnership } from "@/types/business-workflows";

type UnitOption = { unitId: number; propertyId: number; ref: string; currency?: string };

export default function EstatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const permissions = useAuthStore(state => state.permissions);
  const token = useAuthStore(state => state.token);
  const scopedPropertyIds = useAuthStore(state => state.propertyIds);
  const scopedPropertyNames = useAuthStore(state => state.propertyNames);
  const canManage = permissions.includes("manage_estate");
  const canCharge = permissions.includes("create_service_charge");
  const requestedPropertyId = Number(searchParams.get("propertyId"));
  const initialPropertyId = Number.isSafeInteger(requestedPropertyId) && scopedPropertyIds.includes(requestedPropertyId)
    ? String(requestedPropertyId) : "all";
  const requestedScopedPropertyId = Number.isSafeInteger(requestedPropertyId) && scopedPropertyIds.includes(requestedPropertyId)
    ? requestedPropertyId : undefined;

  const [propertyFilter, setPropertyFilter] = useState(initialPropertyId);
  const [items, setItems] = useState<PropertyOwnership[]>([]);
  const [charges, setCharges] = useState<EstateServiceCharge[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [assignmentUnitId, setAssignmentUnitId] = useState("");
  const [busy, setBusy] = useState(false);
  const [endingOwnership, setEndingOwnership] = useState<PropertyOwnership | null>(null);
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [endReason, setEndReason] = useState("");
  const [chargeOwnershipId, setChargeOwnershipId] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeCurrency, setChargeCurrency] = useState("KES");
  const [chargeDue, setChargeDue] = useState(new Date().toISOString().slice(0, 10));
  const [chargeDescription, setChargeDescription] = useState("Service charge");
  const queryScopeApplied = useRef(false);

  const properties = useMemo(() => scopedPropertyIds.map((id, index) => ({
    id, name: scopedPropertyNames[index] ?? `Property #${id}`,
  })), [scopedPropertyIds, scopedPropertyNames]);

  useEffect(() => {
    if (!queryScopeApplied.current && Number.isSafeInteger(requestedPropertyId) && scopedPropertyIds.includes(requestedPropertyId)) {
      queryScopeApplied.current = true;
      setPropertyFilter(String(requestedPropertyId));
    }
  }, [requestedPropertyId, scopedPropertyIds]);

  const load = useCallback(async () => {
    try {
      const browserPropertyParam = new URLSearchParams(window.location.search).get("propertyId");
      const browserRequestedPropertyId = browserPropertyParam ? Number(browserPropertyParam) : Number.NaN;
      const safeBrowserPropertyId = Number.isSafeInteger(browserRequestedPropertyId) && browserRequestedPropertyId > 0
        ? browserRequestedPropertyId : undefined;
      const propertyId = propertyFilter === "all" ? (requestedScopedPropertyId ?? safeBrowserPropertyId) : Number(propertyFilter);
      const [ownershipResponse, chargeResponse] = await Promise.all([
        estateService.listOwnership({ propertyId }),
        estateService.listServiceCharges({ propertyId }),
      ]);
      setItems(ownershipResponse.data?.data ?? []);
      setCharges(chargeResponse.data?.data ?? []);
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Could not load estate records."));
    }
  }, [propertyFilter, requestedScopedPropertyId]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  useEffect(() => {
    if (!canManage || propertyFilter === "all") {
      return;
    }
    let current = true;
    void fetchUnitList({ page: 0, size: 100, propertyId: Number(propertyFilter), leaseMode: "SERVICE_CHARGE", sort: "ref,asc" }, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(response => { if (current) setUnits((response.data.data ?? []) as UnitOption[]); })
      .catch((error: unknown) => toast.error(apiErrorMessage(error, "Could not load homes for this estate.")));
    return () => { current = false; };
  }, [canManage, propertyFilter, token]);

  async function endOwnership(event: FormEvent) {
    event.preventDefault();
    if (!endingOwnership) return;
    setBusy(true);
    try {
      await estateService.endOwnership(endingOwnership.id, { endDate, reason: endReason.trim() });
      toast.success("Ownership ended, access revoked, history retained, and the homeowner notified.");
      setEndingOwnership(null);
      setEndReason("");
      await load();
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Could not end ownership."));
    } finally { setBusy(false); }
  }

  async function createCharge(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await estateService.createServiceCharge({
        ownershipId: Number(chargeOwnershipId), amount: Number(chargeAmount), currency: chargeCurrency,
        dueDate: chargeDue, description: chargeDescription.trim(),
      });
      toast.success("Service-charge invoice created and queued for delivery.");
      setChargeAmount("");
      await load();
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Could not create service charge."));
    } finally { setBusy(false); }
  }

  const currentOwnerships = items.filter(item => item.active);
  const overdue = charges.filter(charge => charge.status === "OVERDUE");
  const outstanding = charges.filter(charge => !charge.paid).reduce((sum, charge) => sum + charge.pendingAmount, 0);
  const estatePropertyIds = Array.from(new Set([...currentOwnerships.map(item => item.propertyId), ...(canManage ? scopedPropertyIds : [])]));

  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-semibold uppercase tracking-[.18em] text-[#EF4217]">SlickHood Estates</p><h1 className="mt-1 text-3xl font-bold">{canManage ? "Estate Management" : "My Home"}</h1><p className="text-muted-foreground">{canManage ? "Manage homeowner onboarding, ownership history, service charges and estate operations." : "View your homes, service charges, balances and payment documents."}</p></div>
      {canManage && <div className="w-full sm:w-72"><Label id="estate-filter-label" htmlFor="estate-filter">Estate</Label><Select value={propertyFilter} onValueChange={value => { setPropertyFilter(value); setAssignmentUnitId(""); }}><SelectTrigger id="estate-filter" aria-labelledby="estate-filter-label"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All estates</SelectItem>{properties.map(property => <SelectItem key={property.id} value={String(property.id)}>{property.name}</SelectItem>)}</SelectContent></Select></div>}
    </div>

    {!canManage && <div className="grid gap-4 sm:grid-cols-3"><Card><CardHeader className="pb-2"><CardDescription>Owned units</CardDescription><CardTitle>{currentOwnerships.length}</CardTitle></CardHeader></Card><Card><CardHeader className="pb-2"><CardDescription>Outstanding balance</CardDescription><CardTitle>{charges[0]?.currency ?? "KES"} {outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</CardTitle></CardHeader></Card><Card><CardHeader className="pb-2"><CardDescription>Overdue charges</CardDescription><CardTitle className={overdue.length ? "text-red-600" : "text-emerald-600"}>{overdue.length}</CardTitle></CardHeader></Card></div>}

    {canManage && <Card><CardHeader><CardTitle>Assign a homeowner</CardTitle><CardDescription>Select an estate and home, then use its secure, email-bound one-time invitation. Ownership activates only after the invited person accepts.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end"><div className="min-w-0 flex-1"><Label id="assignment-home-label" htmlFor="assignment-home">Home</Label><Select value={assignmentUnitId} onValueChange={setAssignmentUnitId} disabled={propertyFilter === "all"}><SelectTrigger id="assignment-home" aria-labelledby="assignment-home-label"><SelectValue placeholder={propertyFilter === "all" ? "Select an estate first" : "Select a home"} /></SelectTrigger><SelectContent>{units.map(unit => <SelectItem key={unit.unitId} value={String(unit.unitId)}>{unit.ref}</SelectItem>)}</SelectContent></Select></div><Button className="bg-[#EF4217]" disabled={!assignmentUnitId} onClick={() => router.push(`/dashboard/unit/details/${assignmentUnitId}?p=${propertyFilter}&from=homeowners`)}>Open home & invite</Button></CardContent></Card>}

    <Card><CardHeader><CardTitle>Ownership registry</CardTitle><CardDescription>Current and historical records are retained for audit and financial continuity.</CardDescription></CardHeader><CardContent className="space-y-3">{items.length === 0 && <p className="py-8 text-center text-muted-foreground">No ownership records in this scope.</p>}{items.map(item => <div key={item.id} className="flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><strong>{item.homeownerName || item.homeownerEmail}</strong><Badge variant={item.active ? "default" : "outline"}>{item.active ? "Current" : "Historical"}</Badge></div><p className="text-sm text-muted-foreground">{item.homeownerEmail} · {item.propertyName}{item.unitRef ? ` / ${item.unitRef}` : ""} · {item.ownershipStart}{item.ownershipEnd ? ` to ${item.ownershipEnd}` : " to present"}</p>{item.terminationReason && <p className="mt-1 text-sm text-muted-foreground">Reason: {item.terminationReason}</p>}</div>{canManage && item.active && <div className="flex flex-wrap gap-2"><Button size="sm" asChild><Link href={`/dashboard/documents?propertyId=${item.propertyId}&recipientUserId=${item.homeownerUserId}&type=ESTATE_RESIDENTIAL_AGREEMENT`}>Residential agreement</Link></Button><Button size="sm" variant="outline" onClick={() => { setEndingOwnership(item); setEndDate(new Date().toISOString().slice(0, 10)); }}>End ownership</Button></div>}</div>)}</CardContent></Card>

    {canCharge && <Card><CardHeader><CardTitle>Create service charge</CardTitle><CardDescription>Create a real invoice for a current homeowner. Delivery and reminders use the notification outbox.</CardDescription></CardHeader><CardContent><form onSubmit={createCharge} className="grid gap-4 md:grid-cols-5"><div><Label>Homeowner / home</Label><Select value={chargeOwnershipId} onValueChange={value => { setChargeOwnershipId(value); const selected = currentOwnerships.find(item => item.id === Number(value)); const unit = units.find(candidate => candidate.unitId === selected?.unitId); if (unit?.currency) setChargeCurrency(unit.currency); }}><SelectTrigger><SelectValue placeholder="Select current ownership" /></SelectTrigger><SelectContent>{currentOwnerships.filter(item => item.unitId).map(item => <SelectItem key={item.id} value={String(item.id)}>{item.homeownerName || item.homeownerEmail} · {item.propertyName} / {item.unitRef}</SelectItem>)}</SelectContent></Select></div><div><Label>Amount</Label><Input required type="number" min="0.01" step="0.01" value={chargeAmount} onChange={event => setChargeAmount(event.target.value)} /></div><div><Label>Currency</Label><Input required maxLength={3} value={chargeCurrency} onChange={event => setChargeCurrency(event.target.value.toUpperCase())} /></div><div><Label>Due date</Label><Input required type="date" value={chargeDue} onChange={event => setChargeDue(event.target.value)} /></div><div><Label>Description</Label><Input required maxLength={255} value={chargeDescription} onChange={event => setChargeDescription(event.target.value)} /></div><div className="md:col-span-5"><Button disabled={busy || !chargeOwnershipId || !chargeDescription.trim()}>Create invoice</Button></div></form></CardContent></Card>}

    <Card><CardHeader><CardTitle>Service charges</CardTitle><CardDescription>Balances update only after verified payment reconciliation. Checkout and receipts are available in Invoices.</CardDescription></CardHeader><CardContent className="space-y-3">{charges.length === 0 && <p className="py-6 text-center text-muted-foreground">No service charges for this role.</p>}{charges.map(charge => <div key={charge.id} className="flex flex-col justify-between gap-3 rounded border p-4 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><strong>{charge.currency} {charge.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {charge.paid ? "paid" : "outstanding"}</strong><Badge variant={charge.status === "PAID" ? "default" : "outline"} className={charge.status === "OVERDUE" ? "border-red-200 bg-red-50 text-red-700" : charge.status === "PAID" ? "bg-emerald-600" : ""}>{charge.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{charge.description} · {charge.propertyName} / {charge.unitRef} · Due {charge.dueDate} · {charge.invoiceRef}</p></div><Button asChild size="sm" variant="outline"><Link href="/dashboard/invoices">View invoice</Link></Button></div>)}</CardContent></Card>

    <EstateOperationsPanel properties={estatePropertyIds.map(id => ({ id, name: properties.find(property => property.id === id)?.name ?? currentOwnerships.find(item => item.propertyId === id)?.propertyName ?? `Property #${id}` }))} canManage={canManage} />
    <Dialog open={Boolean(endingOwnership)} onOpenChange={open => { if (!open && !busy) { setEndingOwnership(null); setEndReason(""); } }}><DialogContent><form onSubmit={endOwnership} className="space-y-4"><DialogHeader><DialogTitle>End ownership</DialogTitle><DialogDescription>This immediately removes homeowner access while preserving ownership and financial history. The homeowner will be notified.</DialogDescription></DialogHeader><div><Label htmlFor="ownership-end-date">End date</Label><Input id="ownership-end-date" required type="date" min={endingOwnership?.ownershipStart} max={new Date().toISOString().slice(0, 10)} value={endDate} onChange={event => setEndDate(event.target.value)} /></div><div><Label htmlFor="ownership-end-reason">Reason</Label><Textarea id="ownership-end-reason" required maxLength={500} value={endReason} onChange={event => setEndReason(event.target.value)} placeholder="For example: property sale completed" /></div><DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setEndingOwnership(null)}>Cancel</Button><Button type="submit" variant="destructive" disabled={busy || !endReason.trim()}>End ownership</Button></DialogFooter></form></DialogContent></Dialog>
  </div>;
}
