"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { Download, FilePlus2, Pencil, Send, Signature } from "lucide-react";
import { leaseDocumentService } from "@/services/lease-document.service";
import { GenerateLeaseDocumentRequest, LeaseDocument, LeaseDocumentTemplate, LeaseDocumentType } from "@/types/lease-document";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiErrorMessage } from "@/lib/api-error";
import { ActiveLease, listActiveLeases } from "@/lib/api";
import { estateService, salesService } from "@/services/business-workflows.service";
import { PropertyOwnership, SaleTransaction } from "@/types/business-workflows";

const rentalTypes: LeaseDocumentType[] = ["RESIDENTIAL_LEASE_AGREEMENT", "COMMERCIAL_LEASE_AGREEMENT", "LATE_RENT_NOTICE",
  "RENT_DEFAULT_CURE_NOTICE", "LANDLORD_TERMINATION_NOTICE", "TENANT_TERMINATION_NOTICE"];
const saleTypes: LeaseDocumentType[] = ["PROPERTY_SALE_LETTER_OF_OFFER", "PROPERTY_SALE_AGREEMENT"];
const allTypes: LeaseDocumentType[] = [...rentalTypes, "ESTATE_RESIDENTIAL_AGREEMENT", ...saleTypes];
const label = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

const tenantStatusMessage = (document: LeaseDocument) => {
  if (document.status === "DRAFT") return "Draft available for review. Your landlord or manager must issue it before you can acknowledge or sign.";
  if (document.status === "ISSUED") return "Issued to you. Review the PDF, then acknowledge and sign when you are satisfied.";
  if (document.status === "ACKNOWLEDGED") return "You acknowledged this agreement. Your signature is still required.";
  if (document.status === "PARTIALLY_SIGNED") {
    if (document.recipientSignedAt && !document.issuerSignedAt) return "You signed. Waiting for the landlord or manager to sign.";
    if (document.issuerSignedAt && !document.recipientSignedAt) return "The landlord or manager signed. Your signature is required.";
    return "One party has signed. The agreement becomes active after both signatures.";
  }
  if (document.status === "SIGNED") return "Complete: you and the landlord or manager have signed.";
  if (document.status === "CANCELLED") return "This document was cancelled and can no longer be signed.";
  if (document.status === "EXPIRED") return "This document expired. Ask the landlord or manager to issue a current version.";
  return null;
};

export default function DocumentsPage() {
  const token = useAuthStore(s => s.token), role = useAuthStore(s => s.activeRole?.title), workspace = useAuthStore(s => s.activeWorkspaceId);
  return <DocumentsWorkspace key={`${token}:${role}:${workspace}`} />;
}

function DocumentsWorkspace() {
  const searchParams = useSearchParams();
  const activeRole = useAuthStore((state) => state.activeRole);
  const permissions = useAuthStore((state) => state.permissions);
  const token = useAuthStore((state) => state.token);
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [templates, setTemplates] = useState<LeaseDocumentTemplate[]>([]);
  const [leases, setLeases] = useState<ActiveLease[]>([]);
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [ownerships, setOwnerships] = useState<PropertyOwnership[]>([]);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [logoConfigured, setLogoConfigured] = useState(false);
  const [ownershipId, setOwnershipId] = useState(searchParams.get("ownershipId") ?? "");
  const [optionsPage, setOptionsPage] = useState(0);
  const [optionsHasMore, setOptionsHasMore] = useState(false);
  const [optionsError, setOptionsError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const loadSequence = useRef(0);
  const requestedType = searchParams.get("type") as LeaseDocumentType | null;
  const [type, setType] = useState<LeaseDocumentType>(activeRole?.title?.toLowerCase() === "tenant" ? "TENANT_TERMINATION_NOTICE" : requestedType && allTypes.includes(requestedType) ? requestedType : "RESIDENTIAL_LEASE_AGREEMENT");
  const [leaseId, setLeaseId] = useState(searchParams.get("leaseId") ?? "");
  const [saleId, setSaleId] = useState(searchParams.get("saleId") ?? "");
  const [propertyId, setPropertyId] = useState(searchParams.get("propertyId") ?? "");
  const [recipientUserId, setRecipientUserId] = useState(searchParams.get("recipientUserId") ?? "");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [responseDueDate, setResponseDueDate] = useState("");
  const [amount, setAmount] = useState(searchParams.get("amount") ?? "");
  const [currency, setCurrency] = useState(searchParams.get("currency") ?? "KES");
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState<LeaseDocumentTemplate | null>(null);

  const canCreate = permissions.includes("create_lease_document");
  const canIssue = permissions.includes("issue_lease_document");
  const canAcknowledge = permissions.includes("acknowledge_lease_document");
  const canSign = permissions.includes("sign_lease_document");
  const canEditTemplates = permissions.includes("manage_lease_document_template");
  const isTenant = activeRole?.title?.toLowerCase() === "tenant";
  const isSaleDocument = saleTypes.includes(type);
  const isEstateDocument = type === "ESTATE_RESIDENTIAL_AGREEMENT";
  const visibleTypes = useMemo(() => {
    const role = activeRole?.title;
    if (role === "Tenant") return ["TENANT_TERMINATION_NOTICE" as LeaseDocumentType];
    if (["SalesAgent", "SalesCoordinator", "ListingAgent"].includes(role ?? "")) return saleTypes;
    if (["EstateManager", "EstateOperationsManager"].includes(role ?? "")) return ["ESTATE_RESIDENTIAL_AGREEMENT" as LeaseDocumentType];
    if (["Landlord", "PropertyManager", "LeasingOfficer"].includes(role ?? "")) return rentalTypes.filter(t => t !== "TENANT_TERMINATION_NOTICE");
    return allTypes.filter(t => t !== "TENANT_TERMINATION_NOTICE");
  }, [activeRole]);

  useEffect(() => { if (!visibleTypes.includes(type)) setType(visibleTypes[0]); }, [type, visibleTypes]);

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    try {
      setLoading(true); setLoadError("");
      const documentResponse = await leaseDocumentService.list({ page, size: 25,
        leaseId: Number(searchParams.get("leaseId")) || undefined, saleId: Number(searchParams.get("saleId")) || undefined,
        propertyId: Number(searchParams.get("propertyId")) || undefined });
      if (sequence !== loadSequence.current) return;
      setDocuments(documentResponse.data?.data ?? []);
      setTotalPages(documentResponse.data?.totalPages ?? 0);
      if (canCreate || canEditTemplates) {
        const templateResponse = await leaseDocumentService.templates();
        if (sequence !== loadSequence.current) return;
        setTemplates(templateResponse.data?.data ?? []);
      } else {
        setTemplates([]);
      }
    } catch (error: unknown) {
      if (sequence === loadSequence.current) setLoadError(apiErrorMessage(error, "Could not load documents."));
    } finally { if (sequence === loadSequence.current) setLoading(false); }
  }, [canCreate, canEditTemplates, page, searchParams]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!canCreate) return;
    void leaseDocumentService.branding().then(response => setLogoConfigured(Boolean(response.data?.data?.configured))).catch(() => undefined);
  }, [canCreate]);
  useEffect(() => {
    const linkedType = searchParams.get("type") as LeaseDocumentType | null;
    if (linkedType && allTypes.includes(linkedType)) setType(linkedType);
    const linkedLease = searchParams.get("leaseId");
    const linkedSale = searchParams.get("saleId");
    const linkedProperty = searchParams.get("propertyId");
    const linkedRecipient = searchParams.get("recipientUserId");
    if (linkedLease) setLeaseId(linkedLease);
    if (linkedSale) setSaleId(linkedSale);
    if (linkedProperty) setPropertyId(linkedProperty);
    if (linkedRecipient) setRecipientUserId(linkedRecipient);
    const linkedOwnership = searchParams.get("ownershipId");
    if (linkedOwnership) setOwnershipId(linkedOwnership);
  }, [searchParams]);
  useEffect(() => {
    if (!canCreate || !token) return;
    let cancelled = false;
    const request = isSaleDocument ? salesService.list({ page: optionsPage, size: 100 })
      : isEstateDocument ? estateService.listOwnership({ page: optionsPage, size: 100, active: true })
      : listActiveLeases(optionsPage, 100, token);
    void request.then(response => {
      if (cancelled) return;
      const data = response.data?.data ?? [];
      setOptionsError(""); setOptionsHasMore(optionsPage + 1 < (response.data?.totalPages ?? 0));
      if (isSaleDocument) setSales(current => optionsPage ? [...current, ...data] : data);
      else if (isEstateDocument) setOwnerships(current => optionsPage ? [...current, ...data] : data);
      else setLeases(current => optionsPage ? [...current, ...data] : data);
    }).catch(error => { if (!cancelled) setOptionsError(apiErrorMessage(error, "Could not load document choices.")); });
    return () => { cancelled = true; };
  }, [canCreate, token, isSaleDocument, isEstateDocument, optionsPage]);

  useEffect(() => {
    const lease = leases.find(item => String(item.id) === leaseId);
    if (!isSaleDocument && !isEstateDocument && lease) {
      setEffectiveDate(lease.moveInDate ?? ""); setAmount(lease.price == null ? "" : String(lease.price)); setCurrency(lease.currency ?? "KES");
    }
    const sale = sales.find(item => String(item.id) === saleId);
    if (isSaleDocument && sale) { setAmount(sale.offerAmount == null ? "" : String(sale.offerAmount)); setCurrency(sale.currency); }
    const ownership = ownerships.find(item => String(item.id) === ownershipId);
    if (isEstateDocument && ownership) setEffectiveDate(ownership.ownershipStart);
  }, [leaseId, saleId, leases, sales, isSaleDocument, isEstateDocument, ownerships, ownershipId]);

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const logo = event.target.files?.[0];
    if (!logo) return;
    if (logo.size > 512 * 1024 || !["image/png", "image/jpeg"].includes(logo.type)) { toast.error("Use a PNG or JPEG logo no larger than 512 KB."); event.target.value = ""; return; }
    setBusy(true);
    try { await leaseDocumentService.uploadLogo(logo); setLogoConfigured(true); toast.success("Document logo updated."); }
    catch (error: unknown) { toast.error(apiErrorMessage(error, "Could not update the document logo.")); }
    finally { setBusy(false); event.target.value = ""; }
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    const payload: GenerateLeaseDocumentRequest = {
      documentType: type,
      ownershipId: isEstateDocument && ownershipId ? Number(ownershipId) : undefined,
      leaseId: !isSaleDocument && !isEstateDocument ? Number(leaseId) : undefined,
      saleId: isSaleDocument ? Number(saleId) : undefined,
      propertyId: isEstateDocument ? Number(propertyId) : undefined,
      recipientUserId: isEstateDocument ? Number(recipientUserId) : undefined,
      effectiveDate: effectiveDate || undefined,
      responseDueDate: responseDueDate || undefined,
      amount: amount ? Number(amount) : undefined,
      currency: currency || undefined,
      reason: reason || undefined,
    };
    setBusy(true);
    try {
      await leaseDocumentService.generate(payload);
      toast.success("Document draft created.");
      setReason(""); setAmount("");
      await load();
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Could not create the document."));
    } finally { setBusy(false); }
  }

  async function action(id: number, name: "issue" | "acknowledge" | "sign" | "cancelDraft") {
    if (name === "sign" && !window.confirm("I have reviewed this document and agree to sign it electronically.")) return;
    if (name === "cancelDraft" && !window.confirm("Cancel this unissued draft? Its history will be retained; you can create a replacement.")) return;
    setBusy(true);
    try {
      await leaseDocumentService[name](id);
      toast.success(`Document ${name === "issue" ? "issued" : name === "sign" ? "signed" : name === "cancelDraft" ? "draft cancelled" : "acknowledged"}.`);
      await load();
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "That action could not be completed."));
    } finally { setBusy(false); }
  }

  async function viewPdf(id: number) {
    try {
      const response = await leaseDocumentService.pdf(id);
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a"); anchor.href = url; anchor.target = "_blank"; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch { toast.error("Could not open the PDF."); }
  }

  async function saveTemplate(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await leaseDocumentService.editTemplate(editing);
      toast.success("Edit saved as a new template version.");
      setEditing(null); await load();
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Could not save the template edit."));
    } finally { setBusy(false); }
  }

  return <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
    <div><h1 className="text-3xl font-bold text-[#141130] dark:text-white">{isTenant ? "My lease documents" : "Documents & notices"}</h1>
      <p className="text-muted-foreground">{isTenant ? "Review the current draft and follow its issue, acknowledgement, and two-party signing status." : "Versioned agreements and notices with delivery, acknowledgement, signatures, and audit-safe snapshots."}</p></div>

    {canCreate && <Card><CardHeader><CardTitle>Document owner branding</CardTitle><CardDescription>The logo belongs to this account and is used for properties owned by this account. Employees use their employer/property owner’s saved logo.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{logoConfigured ? "Logo configured" : "No logo configured"}</p><p className="text-sm text-muted-foreground">PNG or JPEG, maximum 512 KB. Every generated draft snapshots the current logo.</p></div><div><Label htmlFor="document-logo" className="sr-only">Document owner logo</Label><Input id="document-logo" type="file" accept="image/png,image/jpeg" disabled={busy} onChange={uploadLogo} /></div></CardContent></Card>}

    {canCreate && <Card><CardHeader><CardTitle className="flex items-center gap-2"><FilePlus2 className="h-5 w-5 text-[#EF4217]" />Create draft</CardTitle>
      <CardDescription>Rentals use a Residential or Commercial Lease Agreement. Property sales use a Letter of Offer. Estate managers use an Estate Residential Agreement.</CardDescription></CardHeader>
      <CardContent><form onSubmit={generate} className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2"><Label htmlFor="document-type">Document type</Label><select id="document-type" value={type} onChange={(e) => { setType(e.target.value as LeaseDocumentType); setOptionsPage(0); setOptionsHasMore(false); }} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
          {visibleTypes.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></div>
        {isSaleDocument ? <div className="space-y-2"><Label htmlFor="sale-id">Property sale</Label><select id="sale-id" required value={saleId} onChange={(e) => setSaleId(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Select a sale</option>{saleId && !sales.some(item => String(item.id) === saleId) && <option value={saleId}>Selected sale #{saleId}</option>}{sales.map(sale => <option key={sale.id} value={sale.id}>{sale.propertyName ?? `Property ${sale.propertyId}`} · {sale.unitRef ?? `Unit ${sale.unitId}`} · {sale.buyerName ?? sale.buyerEmail ?? sale.invitedBuyerEmail ?? "Buyer pending"}</option>)}</select>{sales.length === 0 && !saleId && <p className="text-xs text-muted-foreground">Create the sale record first, then prepare its documents.</p>}</div> : isEstateDocument ? <div className="space-y-2"><Label htmlFor="ownership-id">Homeowner and property</Label><select id="ownership-id" required value={ownershipId} onChange={(e) => { const ownership = ownerships.find(o => String(o.id) === e.target.value); setOwnershipId(e.target.value); setPropertyId(ownership ? String(ownership.propertyId) : ""); setRecipientUserId(ownership ? String(ownership.homeownerUserId) : ""); setEffectiveDate(ownership?.ownershipStart ?? ""); }} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Select a current homeowner</option>{propertyId && recipientUserId && !ownerships.some(item => String(item.propertyId) === propertyId && String(item.homeownerUserId) === recipientUserId) && <option value={`${propertyId}:${recipientUserId}`}>Selected homeowner for property #{propertyId}</option>}{ownerships.map(item => <option key={item.id} value={String(item.id)}>{item.homeownerName || item.homeownerEmail} · {item.propertyName}{item.unitRef ? ` / ${item.unitRef}` : ""}</option>)}</select>{ownerships.length === 0 && !(propertyId && recipientUserId) && <p className="text-xs text-muted-foreground">Add the homeowner in Estate Management first.</p>}</div> :
          <div className="space-y-2"><Label htmlFor="lease-id">Lease</Label><select id="lease-id" required value={leaseId} onChange={(e) => setLeaseId(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Select a lease</option>{leaseId && !leases.some(item => String(item.id) === leaseId) && <option value={leaseId}>Selected lease #{leaseId}</option>}{leases.map(lease => <option key={lease.id} value={lease.id}>{lease.name || `Lease ${lease.id}`} · {lease.tenantName || "Tenant pending"}{lease.expiryDate ? ` · expires ${lease.expiryDate}` : ""}</option>)}</select>{leases.length === 0 && !leaseId && <p className="text-xs text-muted-foreground">Create the lease first, then prepare its agreement or notice.</p>}</div>}
        {optionsError && <p role="alert" className="text-red-700 md:col-span-3">{optionsError}</p>}
        {optionsHasMore && <Button type="button" variant="outline" onClick={() => setOptionsPage(p => p + 1)}>Load more choices</Button>}
        <div className="space-y-2"><Label htmlFor="effective-date">Effective date</Label><Input id="effective-date" type="date" required={isEstateDocument || type.endsWith("AGREEMENT")} value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="response-due">Response due</Label><Input id="response-due" type="date" required={type === "PROPERTY_SALE_LETTER_OF_OFFER"} value={responseDueDate} onChange={(e) => setResponseDueDate(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="document-amount">Amount</Label><Input id="document-amount" type="number" required={isSaleDocument || type.includes("LEASE_AGREEMENT")} min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="document-currency">Currency</Label><Input id="document-currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} /></div>
        <div className="space-y-2 md:col-span-3"><Label htmlFor="document-reason">Additional schedule details</Label><Textarea id="document-reason" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional: permitted use, handover details, account period, special condition, or other transaction detail." /><p className="text-xs text-muted-foreground">Saved in this immutable document version. To change a standard legal clause, create a new controlled template version below.</p></div>
        <div className="md:col-span-3"><Button disabled={busy} className="bg-[#EF4217] hover:bg-[#d83a13]">Create draft</Button></div>
      </form></CardContent></Card>}

    <Card><CardHeader><CardTitle>Your documents</CardTitle></CardHeader><CardContent className="space-y-3">
      {loading && <p role="status">Loading documents…</p>}
      {loadError && <div role="alert">{loadError}<Button variant="outline" onClick={() => void load()}>Retry</Button></div>}
      {!loading && !loadError && documents.length === 0 && <p className="py-8 text-center text-muted-foreground">No documents match this account and selection.</p>}
      {documents.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.name}</p><Badge variant="outline">{label(item.status)}</Badge>
          {item.legalReviewRequired && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Legal review</Badge>}</div>
          <p className="text-sm text-muted-foreground">#{item.id} · Template v{item.templateVersion} · {item.leaseId ? `Lease ${item.leaseId}` : item.saleId ? `Sale ${item.saleId}` : `Property ${item.propertyId}`}</p>
          {isTenant && tenantStatusMessage(item) && <p className="mt-2 max-w-2xl text-sm font-medium text-[#14235C]">{tenantStatusMessage(item)}</p>}
          <p className="mt-2 text-sm">Issuer: {item.issuerSignedAt ? "Signed" : "Not signed"} · Recipient: {item.recipientSignedAt ? "Signed" : "Not signed"}{item.responseDueDate ? ` · Respond by ${item.responseDueDate}` : ""}</p>
          {item.documentType === "PROPERTY_SALE_LETTER_OF_OFFER" && <p className="text-sm text-muted-foreground">Both signatures reserve the sale automatically. No separate acceptance is needed.</p>}
          {item.legalReviewRequired && <p className="text-sm text-amber-800">Issue is blocked pending template approval. Cancel this draft and regenerate after the approved version is available.</p>}</div>
        <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => viewPdf(item.id)}><Download className="mr-1 h-4 w-4" />PDF</Button>
          {canIssue && item.viewerParty === "ISSUER" && item.status === "DRAFT" && <Button size="sm" onClick={() => action(item.id, "issue")} disabled={busy || item.legalReviewRequired}><Send className="mr-1 h-4 w-4" />Issue</Button>}
          {canCreate && item.viewerParty === "ISSUER" && item.status === "DRAFT" && <Button size="sm" variant="outline" onClick={() => action(item.id, "cancelDraft")} disabled={busy}>Cancel draft</Button>}
          {canAcknowledge && item.viewerParty === "RECIPIENT" && item.status === "ISSUED" && <Button size="sm" variant="outline" onClick={() => action(item.id, "acknowledge")} disabled={busy}>Acknowledge</Button>}
          {canSign && ((item.viewerParty === "RECIPIENT" && !item.recipientSignedAt) || (item.viewerParty === "ISSUER" && !item.issuerSignedAt && (!item.documentType.includes("LEASE_AGREEMENT") || item.recipientSignedAt))) && ["ISSUED", "ACKNOWLEDGED", "PARTIALLY_SIGNED"].includes(item.status) && <Button size="sm" variant="outline" onClick={() => action(item.id, "sign")} disabled={busy}><Signature className="mr-1 h-4 w-4" />Sign</Button>}
        </div></div>)}
      {totalPages > 1 && <div className="flex items-center justify-between border-t pt-4"><Button type="button" variant="outline" disabled={page === 0 || busy} onClick={() => setPage(value => value - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span><Button type="button" variant="outline" disabled={page >= totalPages - 1 || busy} onClick={() => setPage(value => value + 1)}>Next</Button></div>}
    </CardContent></Card>

    {canEditTemplates && <Card><CardHeader><CardTitle>Standard and reusable templates</CardTitle><CardDescription>“Edit” creates a new controlled version. Existing issued documents never change. Record the existing manual approval before enabling a version for issue; changed legal clauses require renewed approval.</CardDescription></CardHeader>
      <CardContent>{!editing ? <div className="space-y-2">{templates.map((template) => <div key={template.id} className="flex items-center justify-between rounded border p-3"><span>{template.displayName} · v{template.version} · {template.legalReviewRequired ? "Review required" : `Manual approval recorded${template.legalReviewedAt ? ` ${new Date(template.legalReviewedAt).toLocaleDateString()}` : ""}`}</span>
        <Button size="sm" variant="outline" onClick={() => setEditing({...template, legalReviewRequired: true})}><Pencil className="mr-1 h-4 w-4" />Edit</Button></div>)}</div> :
        <form onSubmit={saveTemplate} className="space-y-4"><div className="space-y-2"><Label>Name</Label><Input value={editing.displayName} onChange={(e) => setEditing({...editing, displayName: e.target.value})} /></div>
          <div className="space-y-2"><Label>Template HTML with Mustache fields</Label><Textarea className="min-h-80 font-mono text-xs" value={editing.bodyHtml} onChange={(e) => setEditing({...editing, bodyHtml: e.target.value})} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!editing.legalReviewRequired} onChange={(e) => setEditing({...editing, legalReviewRequired: !e.target.checked})} />Approved for issue after legal review</label>
          <div className="flex gap-2"><Button disabled={busy}>Save new version</Button><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button></div></form>}
      </CardContent></Card>}
  </div>;
}
