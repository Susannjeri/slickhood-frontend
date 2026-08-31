"use client";

import {FormEvent, useCallback, useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {ArrowLeft, CheckCircle2, Clock, FileCheck2, RefreshCw, ShieldCheck, Users} from "lucide-react";
import {
  InsuranceCase,
  InsuranceClaim,
  InsuranceCompany,
  InsuranceOperationsSummary,
  InsurancePayment,
  InsurancePolicy,
  InsuranceStaff,
  insuranceService,
} from "@/services/insurance.service";
import {useAuthStore} from "@/store/authStore";
import {apiErrorMessage} from "@/lib/api-error";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

const EMPTY_SUMMARY: InsuranceOperationsSummary = {
  openCases: 0,
  unassignedCases: 0,
  paymentsAwaitingVerification: 0,
  openClaims: 0,
  renewalsDue: 0,
};

const CLAIM_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ["ACKNOWLEDGED", "DOCS_REQUIRED"],
  ACKNOWLEDGED: ["DOCS_REQUIRED", "SENT_TO_INSURER"],
  DOCS_REQUIRED: ["SENT_TO_INSURER"],
  SENT_TO_INSURER: ["ASSESSED", "APPROVED", "DECLINED"],
  ASSESSED: ["APPROVED", "DECLINED"],
  APPROVED: ["SETTLED"],
  DECLINED: ["CLOSED"],
  SETTLED: ["CLOSED"],
};

const RENEWAL_TRANSITIONS: Record<string, string[]> = {
  UPCOMING: ["CONTACTED"],
  CONTACTED: ["RENEWAL_QUOTED", "LAPSED"],
  RENEWAL_QUOTED: ["ACCEPTED", "LAPSED"],
  ACCEPTED: ["PAID", "LAPSED"],
  PAID: ["RENEWED"],
};

const blankQuote = {
  companyId: "",
  quoteNumber: "",
  currency: "KES",
  basePremium: "",
  taxesLevies: "0",
  totalPremium: "",
  excessDetails: "",
  coverageSummary: "",
  exclusions: "",
  validUntil: "",
};

type Action =
  | {kind: "assign"; item: InsuranceCase}
  | {kind: "case-status"; item: InsuranceCase}
  | {kind: "quote"; item: InsuranceCase}
  | {kind: "approve-quote"; item: InsuranceCase; quoteId: number; insurer: string}
  | {kind: "payment-decision"; item: InsurancePayment; decision: "VERIFIED" | "REJECTED"}
  | {kind: "remit"; item: InsurancePayment}
  | {kind: "issue-policy"; item: InsuranceCase}
  | {kind: "claim-status"; item: InsuranceClaim}
  | {kind: "renewal-status"; item: InsurancePolicy};

const title = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, character => character.toUpperCase());
const pageContent = <T,>(result: {content?: T[]}) => Array.isArray(result.content) ? result.content : [];

export default function InsuranceOperationsPage() {
  const permissions = useAuthStore(state => state.permissions);
  const canReview = permissions.includes("review_insurance_applications");
  const canQuote = permissions.includes("manage_insurance_quotes");
  const canApprove = permissions.includes("approve_insurance_quotes");
  const canVerify = permissions.includes("verify_insurance_payments");
  const canIssue = permissions.includes("issue_insurance_policies");
  const canManageClaims = permissions.includes("manage_insurance_claims");
  const canManageRenewals = permissions.includes("manage_insurance_renewals");
  const canReport = permissions.includes("view_insurance_reports");
  const canUseApplicationQueue = canReview || canQuote || canApprove || canVerify || canIssue;
  const allowed = canUseApplicationQueue || canManageClaims || canManageRenewals || canReport;

  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [cases, setCases] = useState<InsuranceCase[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [renewals, setRenewals] = useState<InsurancePolicy[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [staff, setStaff] = useState<InsuranceStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [adviserId, setAdviserId] = useState("");
  const [caseStatus, setCaseStatus] = useState("INFORMATION_REQUIRED");
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [quote, setQuote] = useState(blankQuote);
  const [policy, setPolicy] = useState({policyNumber: "", startDate: "", endDate: ""});
  const [claimStatus, setClaimStatus] = useState("");
  const [insurerReference, setInsurerReference] = useState("");
  const [renewalStatus, setRenewalStatus] = useState("");

  const defaultTab = canUseApplicationQueue ? "applications" : canManageClaims ? "claims" : "renewals";
  const metrics = useMemo(() => [
    ["Open applications", summary.openCases, FileCheck2],
    ["Unassigned", summary.unassignedCases, Users],
    ["Payments to verify", summary.paymentsAwaitingVerification, CheckCircle2],
    ["Open claims", summary.openClaims, ShieldCheck],
    ["Renewals due", summary.renewalsDue, Clock],
  ] as const, [summary]);

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    const requests = await Promise.allSettled([
      canReport ? insuranceService.operationsSummary() : Promise.resolve(EMPTY_SUMMARY),
      canUseApplicationQueue ? insuranceService.operationsCases() : Promise.resolve({content: []}),
      canManageClaims ? insuranceService.operationsClaims() : Promise.resolve({content: []}),
      canManageRenewals ? insuranceService.operationsRenewals() : Promise.resolve({content: []}),
      insuranceService.companies(),
      canReview ? insuranceService.operationsStaff() : Promise.resolve([]),
    ]);

    const [summaryResult, casesResult, claimsResult, renewalsResult, companiesResult, staffResult] = requests;
    if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
    if (casesResult.status === "fulfilled") setCases(pageContent<InsuranceCase>(casesResult.value));
    if (claimsResult.status === "fulfilled") setClaims(pageContent<InsuranceClaim>(claimsResult.value));
    if (renewalsResult.status === "fulfilled") setRenewals(pageContent<InsurancePolicy>(renewalsResult.value));
    if (companiesResult.status === "fulfilled") {
      const values = companiesResult.value.data?.data;
      setCompanies(Array.isArray(values) ? values : []);
    }
    if (staffResult.status === "fulfilled") setStaff(Array.isArray(staffResult.value) ? staffResult.value : []);
    if (requests.some(result => result.status === "rejected")) toast.error("Some insurance queues could not be refreshed. Available data is still shown.");
    setLoading(false);
  }, [allowed, canManageClaims, canManageRenewals, canReport, canReview, canUseApplicationQueue]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function closeAction() {
    setAction(null);
    setAdviserId("");
    setCaseStatus("INFORMATION_REQUIRED");
    setNote("");
    setReference("");
    setQuote(blankQuote);
    setPolicy({policyNumber: "", startDate: "", endDate: ""});
    setClaimStatus("");
    setInsurerReference("");
    setRenewalStatus("");
  }

  async function execute(task: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await task();
      toast.success(message);
      closeAction();
      await load();
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Operation could not be completed."));
    } finally {
      setBusy(false);
    }
  }

  async function submitAction(event: FormEvent) {
    event.preventDefault();
    if (!action) return;
    switch (action.kind) {
      case "assign":
        return execute(() => insuranceService.assignCase(action.item.id, Number(adviserId)), "Application assigned.");
      case "case-status":
        return execute(() => insuranceService.updateCaseStatus(action.item.id, caseStatus, note || undefined), "Application status updated.");
      case "quote":
        return execute(() => insuranceService.addQuote(action.item.id, {
          ...quote,
          companyId: Number(quote.companyId),
          basePremium: Number(quote.basePremium),
          taxesLevies: Number(quote.taxesLevies),
          totalPremium: Number(quote.totalPremium),
        }), "Draft quote saved.");
      case "approve-quote":
        return execute(() => insuranceService.publishQuote(action.item.id, action.quoteId), "Quote approved and published.");
      case "payment-decision":
        return execute(() => insuranceService.decidePayment(action.item.id, action.decision, note || undefined), `Payment ${action.decision.toLowerCase()}.`);
      case "remit":
        return execute(() => insuranceService.remitPayment(action.item.id, reference), "Premium remittance recorded.");
      case "issue-policy":
        return execute(() => insuranceService.issuePolicy(action.item.id, policy), "Policy issued.");
      case "claim-status":
        return execute(() => insuranceService.updateClaim(action.item.id, {status: claimStatus, note: note || undefined, insurerReference: insurerReference || undefined}), "Claim status updated.");
      case "renewal-status":
        return execute(() => insuranceService.updateRenewal(action.item.id, renewalStatus), "Renewal status updated.");
    }
  }

  if (!allowed) return <AccessDenied/>;

  return <div className="min-h-screen bg-slate-50 p-4 sm:p-7">
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="link" asChild className="h-auto p-0"><Link href="/dashboard/insurance"><ArrowLeft className="mr-1 size-4"/>Customer hub</Link></Button>
          <h1 className="mt-2 text-3xl font-bold text-[#10243e]">Silverwood Insurance Operations</h1>
          <p className="text-muted-foreground">Controlled adviser and manager workflow with complete audit history.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`}/>Refresh</Button>
      </div>

      {canReport && <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value, Icon]) => <Card key={label}><CardContent className="flex items-center justify-between p-4"><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div><Icon className="size-7 text-[#1769aa]"/></CardContent></Card>)}
      </div>}

      <Tabs defaultValue={defaultTab} className="mt-6">
        <TabsList>
          {canUseApplicationQueue && <TabsTrigger value="applications">Applications</TabsTrigger>}
          {canManageClaims && <TabsTrigger value="claims">Claims</TabsTrigger>}
          {canManageRenewals && <TabsTrigger value="renewals">Renewals</TabsTrigger>}
        </TabsList>
        {canUseApplicationQueue && <TabsContent value="applications" className="space-y-4"><ApplicationQueue items={cases} permissions={{canReview, canQuote, canApprove, canVerify, canIssue}} onAction={setAction}/></TabsContent>}
        {canManageClaims && <TabsContent value="claims" className="space-y-3"><ClaimQueue items={claims} onAction={item => {setClaimStatus(CLAIM_TRANSITIONS[item.status]?.[0] ?? "");setAction({kind: "claim-status", item});}}/></TabsContent>}
        {canManageRenewals && <TabsContent value="renewals" className="space-y-3"><RenewalQueue items={renewals} onAction={item => {setRenewalStatus(RENEWAL_TRANSITIONS[item.renewalStatus]?.[0] ?? "");setAction({kind: "renewal-status", item});}}/></TabsContent>}
      </Tabs>
    </div>
    <ActionDialog action={action} busy={busy} staff={staff} companies={companies} adviserId={adviserId} setAdviserId={setAdviserId} caseStatus={caseStatus} setCaseStatus={setCaseStatus} note={note} setNote={setNote} reference={reference} setReference={setReference} quote={quote} setQuote={setQuote} policy={policy} setPolicy={setPolicy} claimStatus={claimStatus} setClaimStatus={setClaimStatus} insurerReference={insurerReference} setInsurerReference={setInsurerReference} renewalStatus={renewalStatus} setRenewalStatus={setRenewalStatus} onClose={closeAction} onSubmit={submitAction}/>
  </div>;
}

function ApplicationQueue({items, permissions, onAction}: {items: InsuranceCase[]; permissions: {canReview: boolean; canQuote: boolean; canApprove: boolean; canVerify: boolean; canIssue: boolean}; onAction: (action: Action) => void}) {
  if (!items.length) return <Empty text="No applications in the queue."/>;
  return items.map(item => <Card key={item.id}>
    <CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle>{item.reference} · {title(item.productCode)}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{item.fullName} · {item.phone} · {item.email}</p></div><Badge>{title(item.status)}</Badge></div></CardHeader>
    <CardContent>
      <p className="text-sm">{item.subjectDescription}</p>
      {item.riskDetails && <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">{item.riskDetails}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {permissions.canReview && !item.assignedAdviserId && <Button size="sm" variant="outline" onClick={() => onAction({kind: "assign", item})}>Assign adviser</Button>}
        {permissions.canReview && ["SUBMITTED", "ADVISER_ASSIGNED"].includes(item.status) && <Button size="sm" variant="outline" onClick={() => onAction({kind: "case-status", item})}>Request information</Button>}
        {permissions.canQuote && ["SUBMITTED", "ADVISER_ASSIGNED", "INFORMATION_REQUIRED", "QUOTED"].includes(item.status) && <Button size="sm" variant="outline" onClick={() => onAction({kind: "quote", item})}>Add quote</Button>}
        {permissions.canApprove && item.quotes.filter(value => value.status === "DRAFT").map(value => <Button key={value.id} size="sm" onClick={() => onAction({kind: "approve-quote", item, quoteId: value.id, insurer: value.companyName})}>Approve {value.companyName}</Button>)}
        {permissions.canVerify && item.payments.filter(value => value.status === "PENDING_VERIFICATION").map(value => <span key={value.id} className="flex gap-2"><Button size="sm" disabled={!value.proofAvailable} onClick={() => onAction({kind: "payment-decision", item: value, decision: "VERIFIED"})}>Verify payment</Button><Button size="sm" variant="destructive" onClick={() => onAction({kind: "payment-decision", item: value, decision: "REJECTED"})}>Reject payment</Button></span>)}
        {permissions.canVerify && item.payments.filter(value => value.status === "VERIFIED").map(value => <Button key={value.id} size="sm" onClick={() => onAction({kind: "remit", item: value})}>Record remittance</Button>)}
        {permissions.canIssue && item.status === "PREMIUM_REMITTED" && <Button size="sm" onClick={() => onAction({kind: "issue-policy", item})}>Issue policy</Button>}
      </div>
    </CardContent>
  </Card>);
}

function ClaimQueue({items, onAction}: {items: InsuranceClaim[]; onAction: (item: InsuranceClaim) => void}) {
  if (!items.length) return <Empty text="No claims in the queue."/>;
  return items.map(item => <Card key={item.id}><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{item.reference} · {item.policyNumber}</h3><p className="mt-1 text-sm">{item.description}</p><p className="mt-1 text-xs text-muted-foreground">Incident: {new Date(item.incidentAt).toLocaleString("en-KE")}</p></div><div className="flex items-center gap-2"><Badge>{title(item.status)}</Badge>{(CLAIM_TRANSITIONS[item.status]?.length ?? 0) > 0 && <Button size="sm" variant="outline" onClick={() => onAction(item)}>Update status</Button>}</div></div></CardContent></Card>);
}

function RenewalQueue({items, onAction}: {items: InsurancePolicy[]; onAction: (item: InsurancePolicy) => void}) {
  if (!items.length) return <Empty text="No policies currently need renewal action."/>;
  return items.map(item => <Card key={item.id}><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5"><div><h3 className="font-bold">{item.policyNumber} · {item.companyName}</h3><p className="text-sm text-muted-foreground">Ends {item.endDate}</p></div><div className="flex items-center gap-2"><Badge>{title(item.renewalStatus)}</Badge>{(RENEWAL_TRANSITIONS[item.renewalStatus]?.length ?? 0) > 0 && <Button size="sm" variant="outline" onClick={() => onAction(item)}>Update renewal</Button>}</div></CardContent></Card>);
}

function ActionDialog(props: {action: Action | null; busy: boolean; staff: InsuranceStaff[]; companies: InsuranceCompany[]; adviserId: string; setAdviserId: (value: string) => void; caseStatus: string; setCaseStatus: (value: string) => void; note: string; setNote: (value: string) => void; reference: string; setReference: (value: string) => void; quote: typeof blankQuote; setQuote: (value: typeof blankQuote) => void; policy: {policyNumber: string; startDate: string; endDate: string}; setPolicy: (value: {policyNumber: string; startDate: string; endDate: string}) => void; claimStatus: string; setClaimStatus: (value: string) => void; insurerReference: string; setInsurerReference: (value: string) => void; renewalStatus: string; setRenewalStatus: (value: string) => void; onClose: () => void; onSubmit: (event: FormEvent) => void}) {
  const {action} = props;
  if (!action) return null;
  const heading = action.kind === "assign" ? "Assign insurance adviser" : action.kind === "case-status" ? "Update application" : action.kind === "quote" ? "Add insurer quotation" : action.kind === "approve-quote" ? "Approve customer quotation" : action.kind === "payment-decision" ? `${title(action.decision)} payment evidence` : action.kind === "remit" ? "Record insurer remittance" : action.kind === "issue-policy" ? "Issue policy" : action.kind === "claim-status" ? "Update claim" : "Update renewal";
  return <Dialog open onOpenChange={open => !open && props.onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><form onSubmit={props.onSubmit}><DialogHeader><DialogTitle>{heading}</DialogTitle><DialogDescription>Changes are validated by the insurance lifecycle and recorded in the audit history.</DialogDescription></DialogHeader><div className="mt-5 grid gap-4">
    {action.kind === "assign" && <Field label="Adviser"><Select required value={props.adviserId} onValueChange={props.setAdviserId}><SelectTrigger><SelectValue placeholder="Select an active adviser"/></SelectTrigger><SelectContent>{props.staff.map(person => <SelectItem key={`${person.id}-${person.roleName}`} value={String(person.id)}>{person.fullName || person.email} · {title(person.roleName)}</SelectItem>)}</SelectContent></Select></Field>}
    {action.kind === "case-status" && <><Field label="Next status"><Select value={props.caseStatus} onValueChange={props.setCaseStatus}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="INFORMATION_REQUIRED">Information required</SelectItem><SelectItem value="WITHDRAWN">Withdraw application</SelectItem></SelectContent></Select></Field><Field label="Reason or information required"><Textarea required maxLength={1000} value={props.note} onChange={event => props.setNote(event.target.value)}/></Field></>}
    {action.kind === "quote" && <QuoteFields companies={props.companies} quote={props.quote} setQuote={props.setQuote}/>}
    {action.kind === "approve-quote" && <p className="rounded-lg border bg-slate-50 p-4 text-sm">Publish the draft quotation from <strong>{action.insurer}</strong> to {action.item.fullName}? The customer will be notified.</p>}
    {action.kind === "payment-decision" && <><p className="rounded-lg border bg-slate-50 p-4 text-sm">Reference <strong>{action.item.paymentReference}</strong> · {action.item.currency} {action.item.amount.toLocaleString("en-KE")}</p>{action.decision === "REJECTED" && <Field label="Rejection reason"><Textarea required maxLength={500} value={props.note} onChange={event => props.setNote(event.target.value)}/></Field>}</>}
    {action.kind === "remit" && <Field label="Insurer remittance reference"><Input required maxLength={120} value={props.reference} onChange={event => props.setReference(event.target.value)}/></Field>}
    {action.kind === "issue-policy" && <><Field label="Policy number"><Input required maxLength={120} value={props.policy.policyNumber} onChange={event => props.setPolicy({...props.policy, policyNumber: event.target.value})}/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Cover starts"><Input required type="date" value={props.policy.startDate} onChange={event => props.setPolicy({...props.policy, startDate: event.target.value})}/></Field><Field label="Cover ends"><Input required type="date" min={props.policy.startDate || undefined} value={props.policy.endDate} onChange={event => props.setPolicy({...props.policy, endDate: event.target.value})}/></Field></div></>}
    {action.kind === "claim-status" && <><Field label="Next status"><Select required value={props.claimStatus} onValueChange={props.setClaimStatus}><SelectTrigger><SelectValue placeholder="Select next status"/></SelectTrigger><SelectContent>{(CLAIM_TRANSITIONS[action.item.status] ?? []).map(value => <SelectItem key={value} value={value}>{title(value)}</SelectItem>)}</SelectContent></Select></Field><Field label="Insurer reference (optional)"><Input maxLength={120} value={props.insurerReference} onChange={event => props.setInsurerReference(event.target.value)}/></Field><Field label="Case note"><Textarea maxLength={12000} value={props.note} onChange={event => props.setNote(event.target.value)}/></Field></>}
    {action.kind === "renewal-status" && <Field label="Next status"><Select required value={props.renewalStatus} onValueChange={props.setRenewalStatus}><SelectTrigger><SelectValue placeholder="Select next status"/></SelectTrigger><SelectContent>{(RENEWAL_TRANSITIONS[action.item.renewalStatus] ?? []).map(value => <SelectItem key={value} value={value}>{title(value)}</SelectItem>)}</SelectContent></Select></Field>}
  </div><DialogFooter className="mt-6"><Button type="button" variant="outline" onClick={props.onClose}>Cancel</Button><Button disabled={props.busy}>{props.busy ? "Saving…" : "Confirm"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function QuoteFields({companies, quote, setQuote}: {companies: InsuranceCompany[]; quote: typeof blankQuote; setQuote: (value: typeof blankQuote) => void}) {
  return <><div className="grid gap-4 sm:grid-cols-2"><Field label="Insurer"><Select required value={quote.companyId} onValueChange={companyId => setQuote({...quote, companyId})}><SelectTrigger><SelectValue placeholder="Select insurer"/></SelectTrigger><SelectContent>{companies.map(company => <SelectItem key={company.id} value={String(company.id)}>{company.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Quote number"><Input maxLength={80} value={quote.quoteNumber} onChange={event => setQuote({...quote, quoteNumber: event.target.value})}/></Field><Field label="Base premium"><Input required type="number" min="0" step="0.01" value={quote.basePremium} onChange={event => setQuote({...quote, basePremium: event.target.value})}/></Field><Field label="Taxes and levies"><Input required type="number" min="0" step="0.01" value={quote.taxesLevies} onChange={event => setQuote({...quote, taxesLevies: event.target.value})}/></Field><Field label="Total premium"><Input required type="number" min="0.01" step="0.01" value={quote.totalPremium} onChange={event => setQuote({...quote, totalPremium: event.target.value})}/></Field><Field label="Valid until"><Input required type="date" min={new Date().toISOString().slice(0, 10)} value={quote.validUntil} onChange={event => setQuote({...quote, validUntil: event.target.value})}/></Field></div><Field label="Coverage summary"><Textarea required maxLength={12000} value={quote.coverageSummary} onChange={event => setQuote({...quote, coverageSummary: event.target.value})}/></Field><Field label="Excess details"><Textarea maxLength={1000} value={quote.excessDetails} onChange={event => setQuote({...quote, excessDetails: event.target.value})}/></Field><Field label="Exclusions"><Textarea maxLength={12000} value={quote.exclusions} onChange={event => setQuote({...quote, exclusions: event.target.value})}/></Field></>;
}

function AccessDenied() {
  return <div className="mx-auto max-w-xl p-8"><Card><CardContent className="p-8 text-center"><ShieldCheck className="mx-auto size-12 text-slate-400"/><h1 className="mt-4 text-2xl font-bold">Silverwood staff access only</h1><p className="mt-2 text-muted-foreground">Switch to an assigned Insurance Adviser or Insurance Manager role.</p><Button asChild className="mt-5"><Link href="/dashboard/insurance">Return to Insurance</Link></Button></CardContent></Card></div>;
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return <Label className="flex flex-col items-stretch gap-1.5"><span>{label}</span>{children}</Label>;
}

function Empty({text}: {text: string}) {
  return <p className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">{text}</p>;
}
