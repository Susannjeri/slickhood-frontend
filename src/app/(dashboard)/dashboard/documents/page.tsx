"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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

const rentalTypes: LeaseDocumentType[] = ["RENTAL_LETTER_OF_OFFER", "RESIDENTIAL_LEASE_AGREEMENT", "COMMERCIAL_LEASE_AGREEMENT", "LATE_RENT_NOTICE",
  "RENT_DEFAULT_CURE_NOTICE", "LANDLORD_TERMINATION_NOTICE", "TENANT_TERMINATION_NOTICE"];
const allTypes: LeaseDocumentType[] = [...rentalTypes, "ESTATE_AGREEMENT", "PROPERTY_SALE_AGREEMENT"];
const label = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const activeRole = useAuthStore((state) => state.activeRole);
  const permissions = useAuthStore((state) => state.permissions);
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [templates, setTemplates] = useState<LeaseDocumentTemplate[]>([]);
  const [busy, setBusy] = useState(false);
  const requestedType = searchParams.get("type") as LeaseDocumentType | null;
  const [type, setType] = useState<LeaseDocumentType>(activeRole?.title?.toLowerCase() === "tenant" ? "TENANT_TERMINATION_NOTICE" : requestedType && allTypes.includes(requestedType) ? requestedType : "RENTAL_LETTER_OF_OFFER");
  const [leaseId, setLeaseId] = useState(searchParams.get("leaseId") ?? "");
  const [propertyId, setPropertyId] = useState("");
  const [recipientUserId, setRecipientUserId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [responseDueDate, setResponseDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState<LeaseDocumentTemplate | null>(null);

  const canCreate = permissions.includes("create_lease_document");
  const canIssue = permissions.includes("issue_lease_document");
  const canAcknowledge = permissions.includes("acknowledge_lease_document");
  const canSign = permissions.includes("sign_lease_document");
  const canEditTemplates = permissions.includes("manage_lease_document_template");
  const isPropertyDocument = type === "ESTATE_AGREEMENT" || type === "PROPERTY_SALE_AGREEMENT";
  const visibleTypes = useMemo(() => activeRole?.title?.toLowerCase() === "tenant" ? ["TENANT_TERMINATION_NOTICE" as LeaseDocumentType] : allTypes.filter((t) => t !== "TENANT_TERMINATION_NOTICE"), [activeRole]);

  const load = useCallback(async () => {
    try {
      const [documentResponse, templateResponse] = await Promise.all([leaseDocumentService.list(), leaseDocumentService.templates()]);
      setDocuments(documentResponse.data?.data ?? []);
      setTemplates(templateResponse.data?.data ?? []);
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Could not load documents."));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generate(event: FormEvent) {
    event.preventDefault();
    const payload: GenerateLeaseDocumentRequest = {
      documentType: type,
      leaseId: isPropertyDocument ? undefined : Number(leaseId),
      propertyId: isPropertyDocument ? Number(propertyId) : undefined,
      recipientUserId: isPropertyDocument ? Number(recipientUserId) : undefined,
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

  async function action(id: number, name: "issue" | "acknowledge" | "sign") {
    setBusy(true);
    try {
      await leaseDocumentService[name](id);
      toast.success(`Document ${name === "issue" ? "issued" : name === "sign" ? "signed" : "acknowledged"}.`);
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
    <div><h1 className="text-3xl font-bold text-[#141130] dark:text-white">Documents & notices</h1>
      <p className="text-muted-foreground">Versioned agreements and notices with delivery, acknowledgement, signatures, and audit-safe snapshots.</p></div>

    {canCreate && <Card><CardHeader><CardTitle className="flex items-center gap-2"><FilePlus2 className="h-5 w-5 text-[#EF4217]" />Create draft</CardTitle>
      <CardDescription>For a new tenancy, issue and sign the Letter of Offer before creating the Residential or Commercial Tenancy Agreement.</CardDescription></CardHeader>
      <CardContent><form onSubmit={generate} className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2"><Label htmlFor="document-type">Document type</Label><select id="document-type" value={type} onChange={(e) => setType(e.target.value as LeaseDocumentType)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
          {visibleTypes.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></div>
        {!isPropertyDocument ? <div className="space-y-2"><Label htmlFor="lease-id">Lease ID</Label><Input id="lease-id" required type="number" min="1" value={leaseId} onChange={(e) => setLeaseId(e.target.value)} /></div> : <>
          <div className="space-y-2"><Label>Property ID</Label><Input required type="number" min="1" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} /></div>
          <div className="space-y-2"><Label>Recipient user ID</Label><Input required type="number" min="1" value={recipientUserId} onChange={(e) => setRecipientUserId(e.target.value)} /></div></>}
        <div className="space-y-2"><Label htmlFor="effective-date">Effective date</Label><Input id="effective-date" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="response-due">Response due</Label><Input id="response-due" type="date" value={responseDueDate} onChange={(e) => setResponseDueDate(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="document-amount">Amount</Label><Input id="document-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="document-currency">Currency</Label><Input id="document-currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} /></div>
        <div className="space-y-2 md:col-span-3"><Label htmlFor="document-reason">Reason / additional terms</Label><Textarea id="document-reason" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        <div className="md:col-span-3"><Button disabled={busy} className="bg-[#EF4217] hover:bg-[#d83a13]">Create draft</Button></div>
      </form></CardContent></Card>}

    <Card><CardHeader><CardTitle>Your documents</CardTitle></CardHeader><CardContent className="space-y-3">
      {documents.length === 0 && <p className="py-8 text-center text-muted-foreground">No documents have been created for this active role.</p>}
      {documents.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.name}</p><Badge variant="outline">{label(item.status)}</Badge>
          {item.legalReviewRequired && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Legal review</Badge>}</div>
          <p className="text-sm text-muted-foreground">#{item.id} · Template v{item.templateVersion} · {item.leaseId ? `Lease ${item.leaseId}` : `Property ${item.propertyId}`}</p></div>
        <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => viewPdf(item.id)}><Download className="mr-1 h-4 w-4" />PDF</Button>
          {canIssue && item.status === "DRAFT" && <Button size="sm" onClick={() => action(item.id, "issue")} disabled={busy}><Send className="mr-1 h-4 w-4" />Issue</Button>}
          {canAcknowledge && item.status === "ISSUED" && <Button size="sm" variant="outline" onClick={() => action(item.id, "acknowledge")} disabled={busy}>Acknowledge</Button>}
          {canSign && ["ISSUED", "ACKNOWLEDGED", "PARTIALLY_SIGNED"].includes(item.status) && <Button size="sm" variant="outline" onClick={() => action(item.id, "sign")} disabled={busy}><Signature className="mr-1 h-4 w-4" />Sign</Button>}
        </div></div>)}
    </CardContent></Card>

    {canEditTemplates && <Card><CardHeader><CardTitle>Template maintenance</CardTitle><CardDescription>“Edit” creates a new version. Existing issued documents never change.</CardDescription></CardHeader>
      <CardContent>{!editing ? <div className="space-y-2">{templates.map((template) => <div key={template.id} className="flex items-center justify-between rounded border p-3"><span>{template.displayName} · v{template.version}</span>
        <Button size="sm" variant="outline" onClick={() => setEditing({...template})}><Pencil className="mr-1 h-4 w-4" />Edit</Button></div>)}</div> :
        <form onSubmit={saveTemplate} className="space-y-4"><div className="space-y-2"><Label>Name</Label><Input value={editing.displayName} onChange={(e) => setEditing({...editing, displayName: e.target.value})} /></div>
          <div className="space-y-2"><Label>Template HTML with Mustache fields</Label><Textarea className="min-h-80 font-mono text-xs" value={editing.bodyHtml} onChange={(e) => setEditing({...editing, bodyHtml: e.target.value})} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!editing.legalReviewRequired} onChange={(e) => setEditing({...editing, legalReviewRequired: !e.target.checked})} />Approved for issue after legal review</label>
          <div className="flex gap-2"><Button disabled={busy}>Save new version</Button><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button></div></form>}
      </CardContent></Card>}
  </div>;
}
