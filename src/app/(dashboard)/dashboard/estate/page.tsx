"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
import RequireRole from "@/components/auth/RequireRole";
import { apiErrorMessage } from "@/lib/api-error";
import { usePagedBusinessProperties, usePagedBusinessUnits } from "@/hooks/usePagedBusinessOptions";
import { usePagedEstateRecords } from "@/hooks/usePagedEstateRecords";
import { estateService } from "@/services/business-workflows.service";
import { useAuthStore } from "@/store/authStore";
import { EstateServiceCharge, PropertyOwnership } from "@/types/business-workflows";

const estateRoles = ["EstateManager", "EstateOperationsManager", "WorkspaceAdmin", "PropertyAccountant", "WorkspaceViewer", "SecuritySupervisor", "Homeowner", "Superadmin"];
function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
export default function EstatePage() {
  const role = useAuthStore(state => state.activeRole);
  const token = useAuthStore(state => state.token);
  const workspace = useAuthStore(state => state.activeWorkspaceId);
  return <RequireRole roles={estateRoles} permissions={["view_estate"]}>
    <EstateWorkspace key={`${token}:${role?.title}:${workspace}`} />
  </RequireRole>;
}
function EstateWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const permissions = useAuthStore(state => state.permissions);
  const token = useAuthStore(state => state.token);
  const scopedPropertyIds = useAuthStore(state => state.propertyIds);
  const scopedPropertyNames = useAuthStore(state => state.propertyNames);
  const isHomeowner = useAuthStore(state => state.activeRole?.title === "Homeowner");
  const canViewCharges = permissions.includes("view_service_charge");
  const canViewInvoices = permissions.includes("view_invoice_list");
  const canManage = permissions.includes("manage_estate");
  const canSelectEstate = !isHomeowner && permissions.includes("view_estate");
  const canCharge = permissions.includes("create_service_charge");
  const requestedPropertyId = Number(searchParams.get("propertyId"));
  const initialPropertyId = Number.isSafeInteger(requestedPropertyId) && scopedPropertyIds.includes(requestedPropertyId)
    ? String(requestedPropertyId) : "all";

  const [propertyFilter, setPropertyFilter] = useState(initialPropertyId);
  const [assignmentUnitId, setAssignmentUnitId] = useState("");
  const [busy, setBusy] = useState(false);
  const [endingOwnership, setEndingOwnership] = useState<PropertyOwnership | null>(null);
  const [endDate, setEndDate] = useState(today());
  const [endReason, setEndReason] = useState("");
  const [chargeOwnershipId, setChargeOwnershipId] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeCurrency, setChargeCurrency] = useState("KES");
  const [chargeDue, setChargeDue] = useState(today());
  const [chargeDescription, setChargeDescription] = useState("Service charge");
  const queryScopeApplied = useRef(false);
  const propertyOptions = usePagedBusinessProperties(canSelectEstate && Boolean(token), "SERVICE_CHARGE",
    scopedPropertyIds.map((id, index) => ({ id, name: scopedPropertyNames[index] ?? `Estate ${id}`, managementMode: "SERVICE_CHARGE" })));
  const properties = propertyOptions.items;
  const propertiesLoading = propertyOptions.loading;
  const unitOptions = usePagedBusinessUnits(canManage, propertyFilter === "all" ? null : Number(propertyFilter), "SERVICE_CHARGE");
  const units = unitOptions.items;

  useEffect(() => { if (propertyOptions.error) toast.error(apiErrorMessage(propertyOptions.error, "Could not load your estate properties.")); }, [propertyOptions.error]);
  useEffect(() => { if (unitOptions.error) toast.error(apiErrorMessage(unitOptions.error, "Could not load homes for this estate.")); }, [unitOptions.error]);

  useEffect(() => {
    if (!queryScopeApplied.current && Number.isSafeInteger(requestedPropertyId) && properties.some(property => property.id === requestedPropertyId)) {
      queryScopeApplied.current = true;
      setPropertyFilter(String(requestedPropertyId));
    }
  }, [properties, requestedPropertyId]);

  const propertyId = propertyFilter === "all" ? undefined : Number(propertyFilter);
  const registry = usePagedEstateRecords<PropertyOwnership>("/estate/ownership", Boolean(token), propertyId);
  const current = usePagedEstateRecords<PropertyOwnership>("/estate/ownership", Boolean(token), propertyId, true);
  const billing = usePagedEstateRecords<EstateServiceCharge>("/estate/service-charges", Boolean(token) && canViewCharges, propertyId);
  const items = registry.items;
  const charges = billing.items;
  async function load() { await Promise.all([registry.reload(), current.reload(), billing.reload()]); }
  function changeEstate(value: string) {
    setPropertyFilter(value); setAssignmentUnitId(""); setChargeOwnershipId("");
    setChargeAmount(""); setEndingOwnership(null); setEndReason("");
  }


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
      toast.success("Service-charge invoice created.");
      setChargeAmount("");
      await load();
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Could not create service charge."));
    } finally { setBusy(false); }
  }

  const currentOwnerships = current.items.filter(item => item.active);
  const overdue = charges.filter(charge => charge.status === "OVERDUE");
  const outstandingByCurrency = Object.entries(charges.filter(charge => !charge.paid).reduce<Record<string, number>>((totals, charge) => {
    totals[charge.currency] = (totals[charge.currency] ?? 0) + charge.pendingAmount;
    return totals;
  }, {}));
  const outstandingLabel = outstandingByCurrency.length === 0 ? "KES 0.00" : outstandingByCurrency
    .map(([currency, amount]) => `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    .join(" · ");
  const estatePropertyIds = Array.from(new Set([...currentOwnerships.map(item => item.propertyId), ...(canSelectEstate ? properties.map(property => property.id) : [])]));

  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-semibold uppercase tracking-[.18em] text-[#EF4217]">SlickHood Estates</p><h1 className="mt-1 text-3xl font-bold">{!isHomeowner ? "Estate Management" : "My Home"}</h1><p className="text-muted-foreground">{canManage ? "Manage homeowner onboarding, ownership history, service charges and estate operations." : "View your homes, service charges, balances and payment documents."}</p></div>
      {canSelectEstate && <div className="w-full sm:w-80"><Label id="estate-filter-label" htmlFor="estate-filter">Estate</Label><Input className="mb-2" value={propertyOptions.search} onChange={event=>propertyOptions.setSearch(event.target.value)} placeholder="Search estates…"/><Select value={propertyFilter} onValueChange={changeEstate} disabled={busy || propertiesLoading&&properties.length===0}><SelectTrigger id="estate-filter" aria-labelledby="estate-filter-label"><SelectValue placeholder={propertiesLoading ? "Loading estates…" : "Select an estate"} /></SelectTrigger><SelectContent><SelectItem value="all">All estates</SelectItem>{properties.map(property => <SelectItem key={property.id} value={String(property.id)}>{property.name}</SelectItem>)}</SelectContent></Select>{propertyOptions.hasMore&&<Button type="button" size="sm" variant="outline" className="mt-2" onClick={propertyOptions.loadMore} disabled={propertiesLoading}>Load more estates</Button>}{!propertiesLoading && properties.length === 0 && <p className="mt-2 text-sm text-amber-700">No estate properties are available. Create a property with the Estate Management business area first.</p>}</div>}
    </div>

    {isHomeowner && <div className="grid gap-4 sm:grid-cols-3"><Card><CardHeader className="pb-2"><CardDescription>Current ownerships</CardDescription><CardTitle>{current.loading ? "Loading…" : current.error ? "Unavailable" : current.total}</CardTitle></CardHeader></Card><Card><CardHeader className="pb-2"><CardDescription>Outstanding balance (loaded charges)</CardDescription><CardTitle>{billing.loading ? "Loading…" : billing.error ? "Unavailable" : outstandingLabel}</CardTitle></CardHeader></Card><Card><CardHeader className="pb-2"><CardDescription>Overdue charges (loaded)</CardDescription><CardTitle className={overdue.length ? "text-red-600" : "text-emerald-600"}>{billing.loading ? "Loading…" : billing.error ? "Unavailable" : overdue.length}</CardTitle></CardHeader></Card></div>}

    {canManage && <Card><CardHeader><CardTitle>Assign a homeowner</CardTitle><CardDescription>Select an estate and home, then use its secure, email-bound one-time invitation. Ownership activates only after the invited person accepts.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end"><div className="min-w-0 flex-1"><Label id="assignment-home-label" htmlFor="assignment-home">Home</Label><Input className="mb-2" value={unitOptions.search} onChange={event=>unitOptions.setSearch(event.target.value)} placeholder="Search homes…" disabled={propertyFilter==="all"}/><Select value={assignmentUnitId} onValueChange={setAssignmentUnitId} disabled={propertyFilter === "all"||(unitOptions.loading&&units.length===0)}><SelectTrigger id="assignment-home" aria-labelledby="assignment-home-label"><SelectValue placeholder={propertyFilter === "all" ? "Select an estate first" : unitOptions.loading?"Loading homes…":"Select a home"} /></SelectTrigger><SelectContent>{units.map(unit => <SelectItem key={unit.unitId} value={String(unit.unitId)}>{unit.ref}</SelectItem>)}</SelectContent></Select>{unitOptions.hasMore&&<Button type="button" size="sm" variant="outline" className="mt-2" onClick={unitOptions.loadMore} disabled={unitOptions.loading}>Load more homes</Button>}</div><Button className="bg-[#EF4217]" disabled={!assignmentUnitId} onClick={() => router.push(`/dashboard/unit/details/${assignmentUnitId}?p=${propertyFilter}&from=homeowners`)}>Open home & invite</Button></CardContent></Card>}

    <Card><CardHeader><CardTitle>Ownership registry</CardTitle><CardDescription>Current and historical records are retained for audit and financial continuity.</CardDescription></CardHeader><CardContent className="space-y-3">{!registry.loading && !registry.error && items.length === 0 && <p className="py-8 text-center text-muted-foreground">No ownership records in this scope.</p>}<RecordControls feed={registry} label="ownership records" />{items.map(item => <div key={item.id} className="flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><strong>{item.homeownerName || item.homeownerEmail}</strong><Badge variant={item.active ? "default" : "outline"}>{item.active ? "Current" : "Historical"}</Badge></div><p className="text-sm text-muted-foreground">{item.homeownerEmail} · {item.propertyName}{item.unitRef ? ` / ${item.unitRef}` : ""} · {item.ownershipStart}{item.ownershipEnd ? ` to ${item.ownershipEnd}` : " to present"}</p>{item.terminationReason && <p className="mt-1 text-sm text-muted-foreground">Reason: {item.terminationReason}</p>}</div>{permissions.includes("view_lease_document") && <Button size="sm" variant="outline" asChild><Link href={`/dashboard/documents?propertyId=${item.propertyId}`}>View agreements</Link></Button>}{canManage && item.active && <div className="flex flex-wrap gap-2">{permissions.includes("create_lease_document") && <Button size="sm" asChild><Link href={`/dashboard/documents?propertyId=${item.propertyId}&recipientUserId=${item.homeownerUserId}&ownershipId=${item.id}&type=ESTATE_RESIDENTIAL_AGREEMENT`}>Residential agreement</Link></Button>}<Button size="sm" variant="outline" onClick={() => { setEndingOwnership(item); setEndDate(today()); }}>End ownership</Button></div>}</div>)}</CardContent></Card>

    {canCharge && <Card><CardHeader><CardTitle>Create service charge</CardTitle><CardDescription>Create a real invoice for a current homeowner. Confirm the homeowner, currency and amount before creating an invoice.</CardDescription></CardHeader><CardContent><RecordControls feed={current} label="current homeowners" /><form onSubmit={createCharge} className="grid gap-4 md:grid-cols-5"><div><Label id="charge-homeowner-label">Homeowner / home</Label><Select value={chargeOwnershipId} onValueChange={value => { setChargeOwnershipId(value); const selected = currentOwnerships.find(item => item.id === Number(value)); const unit = units.find(candidate => candidate.unitId === selected?.unitId); if (unit?.currency) setChargeCurrency(unit.currency); }}><SelectTrigger aria-labelledby="charge-homeowner-label"><SelectValue placeholder="Select current ownership" /></SelectTrigger><SelectContent>{currentOwnerships.filter(item => item.unitId).map(item => <SelectItem key={item.id} value={String(item.id)}>{item.homeownerName || item.homeownerEmail} · {item.propertyName} / {item.unitRef}</SelectItem>)}</SelectContent></Select></div><div><Label>Amount</Label><Input required type="number" min="0.01" step="0.01" value={chargeAmount} onChange={event => setChargeAmount(event.target.value)} /></div><div><Label>Currency</Label><Input required maxLength={3} value={chargeCurrency} onChange={event => setChargeCurrency(event.target.value.toUpperCase())} /></div><div><Label>Due date</Label><Input required type="date" value={chargeDue} onChange={event => setChargeDue(event.target.value)} /></div><div><Label>Description</Label><Input required maxLength={255} value={chargeDescription} onChange={event => setChargeDescription(event.target.value)} /></div><div className="md:col-span-5"><Button disabled={busy || current.loading || !currentOwnerships.some(item => String(item.id) === chargeOwnershipId) || !chargeDescription.trim()}>Create invoice</Button></div></form></CardContent></Card>}

    {canViewCharges && <Card><CardHeader><CardTitle>Service charges</CardTitle><CardDescription>Balances update only after verified payment reconciliation. Checkout and receipts are available in Invoices.</CardDescription></CardHeader><CardContent className="space-y-3"><RecordControls feed={billing} label="service charges" />{!billing.loading && !billing.error && charges.length === 0 && <p className="py-6 text-center text-muted-foreground">No service charges for this role.</p>}{charges.map(charge => <div key={charge.id} className="flex flex-col justify-between gap-3 rounded border p-4 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><strong>{charge.currency} {(charge.paid ? charge.amount : charge.pendingAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {charge.paid ? "paid" : "outstanding"}</strong><Badge variant={charge.status === "PAID" ? "default" : "outline"} className={charge.status === "OVERDUE" ? "border-red-200 bg-red-50 text-red-700" : charge.status === "PAID" ? "bg-emerald-600" : ""}>{charge.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{charge.description} · {charge.propertyName} / {charge.unitRef} · Due {charge.dueDate} · {charge.invoiceRef}</p></div>{canViewInvoices && <Button asChild size="sm" variant="outline"><Link href="/dashboard/invoices">View invoices</Link></Button>}</div>)}</CardContent></Card>}

    {isHomeowner && <RecordControls feed={current} label="current homes" />}
    <EstateOperationsPanel key={propertyFilter} properties={estatePropertyIds.filter(id => propertyId === undefined || id === propertyId).map(id => ({ id, name: properties.find(property => property.id === id)?.name ?? currentOwnerships.find(item => item.propertyId === id)?.propertyName ?? `Property #${id}` }))} canManage={canManage} />
    <Dialog open={Boolean(endingOwnership)} onOpenChange={open => { if (!open && !busy) { setEndingOwnership(null); setEndReason(""); } }}><DialogContent><form onSubmit={endOwnership} className="space-y-4"><DialogHeader><DialogTitle>End ownership</DialogTitle><DialogDescription>This immediately removes homeowner access while preserving ownership and financial history. The homeowner will be notified.</DialogDescription></DialogHeader><div><Label htmlFor="ownership-end-date">End date</Label><Input id="ownership-end-date" required type="date" min={endingOwnership?.ownershipStart} max={today()} value={endDate} onChange={event => setEndDate(event.target.value)} /></div><div><Label htmlFor="ownership-end-reason">Reason</Label><Textarea id="ownership-end-reason" required maxLength={500} value={endReason} onChange={event => setEndReason(event.target.value)} placeholder="For example: property sale completed" /></div><DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setEndingOwnership(null)}>Cancel</Button><Button type="submit" variant="destructive" disabled={busy || !endReason.trim()}>End ownership</Button></DialogFooter></form></DialogContent></Dialog>
  </div>;
}

function RecordControls({ feed, label }: { feed: { loading: boolean; error: unknown; hasMore: boolean; total: number; items: unknown[]; reload: () => Promise<void>; loadMore: () => Promise<void> }; label: string }) {
  return <div className="mb-3 space-y-2">
    {feed.loading && <p role="status">Loading {label}…</p>}
    {!!feed.error && <p role="alert" className="text-red-700">{apiErrorMessage(feed.error, `Could not load ${label}.`)} <Button variant="outline" size="sm" onClick={() => void feed.reload()}>Retry {label}</Button></p>}
    {feed.hasMore && <Button type="button" variant="outline" disabled={feed.loading} onClick={() => void feed.loadMore()}>Load more {label} ({feed.items.length} of {feed.total})</Button>}
  </div>;
}
