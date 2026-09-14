"use client";

import {FormEvent, useCallback, useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {ArrowLeft, CheckCircle2, Clock, ExternalLink, Eye, FileCheck2, Inbox, Landmark, Mail, Plus, RefreshCw, Settings2, ShieldCheck, Users} from "lucide-react";
import {
  InsuranceCase,
  InsuranceClaim,
  InsuranceCompany,
  InsuranceCompanyAdmin,
  InsuranceQuotationCompany,
  InsuranceEmailExchange,
  InsuranceAccount,
  InsurancePaymentConfiguration,
  InsuranceOperationsSummary,
  InsurancePayment,
  InsuranceRenewalJourney,
  InsuranceRenewalPayment,
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
import {DistributionChart} from "@/components/dashboard/DashboardCharts";
import {InsuranceBrandLogo} from "@/components/insurance/InsuranceBrandLogo";

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
  sourceExchangeId: "",
};
const blankPartner = {code:"",name:"",logoUrl:"",description:"",quotationEmail:"",claimsEmail:"",renewalsEmail:"",active:true};
const blankPaymentConfiguration = {companyCode:"",paymentAccountId:"",label:"",instructions:"",referenceTemplate:"",effectiveFrom:new Date().toISOString().slice(0,10)};

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
  const searchParams = useSearchParams();
  const permissions = useAuthStore(state => state.permissions);
  const canReview = permissions.includes("review_insurance_applications");
  const canQuote = permissions.includes("manage_insurance_quotes");
  const canApprove = permissions.includes("approve_insurance_quotes");
  const canVerify = permissions.includes("verify_insurance_payments");
  const canIssue = permissions.includes("issue_insurance_policies");
  const canManageClaims = permissions.includes("manage_insurance_claims");
  const canManageRenewals = permissions.includes("manage_insurance_renewals");
  const canReport = permissions.includes("view_insurance_reports");
  const canCatalog = permissions.includes("manage_insurance_catalog");
  const canPaymentConfig = permissions.includes("manage_insurance_payment_config");
  const canUseApplicationQueue = canReview || canQuote || canApprove || canVerify || canIssue;
  const allowed = canUseApplicationQueue || canManageClaims || canManageRenewals || canReport || canCatalog || canPaymentConfig;

  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [cases, setCases] = useState<InsuranceCase[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [renewals, setRenewals] = useState<InsurancePolicy[]>([]);
  const [renewalJourneys,setRenewalJourneys]=useState<InsuranceRenewalJourney[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [adminCompanies,setAdminCompanies]=useState<InsuranceCompanyAdmin[]>([]);
  const [quotationCompanies,setQuotationCompanies]=useState<InsuranceQuotationCompany[]>([]);
  const [accounts,setAccounts]=useState<InsuranceAccount[]>([]);
  const [paymentConfigurations,setPaymentConfigurations]=useState<InsurancePaymentConfiguration[]>([]);
  const [staff, setStaff] = useState<InsuranceStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [evidence,setEvidence]=useState<{payment:InsurancePayment;url:string;loading:boolean;error:string}|null>(null);
  const [adviserId, setAdviserId] = useState("");
  const [caseStatus, setCaseStatus] = useState("INFORMATION_REQUIRED");
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [quote, setQuote] = useState(blankQuote);
  const [quoteFile,setQuoteFile]=useState<File|null>(null);
  const [policy, setPolicy] = useState({policyNumber: "", startDate: "", endDate: ""});
  const [claimStatus, setClaimStatus] = useState("");
  const [insurerReference, setInsurerReference] = useState("");
  const [renewalStatus, setRenewalStatus] = useState("");
  const [partnerOpen,setPartnerOpen]=useState(false);
  const [editingPartner,setEditingPartner]=useState<string|null>(null);
  const [partner,setPartner]=useState(blankPartner);
  const [partnerLogo,setPartnerLogo]=useState<File|null>(null);
  const [paymentConfiguration,setPaymentConfiguration]=useState(blankPaymentConfiguration);
  const [dispatchCase,setDispatchCase]=useState<InsuranceCase|null>(null);
  const [dispatchCompanies,setDispatchCompanies]=useState<string[]>([]);
  const [dispatchSentCompanies,setDispatchSentCompanies]=useState<string[]>([]);
  const [dispatchLoading,setDispatchLoading]=useState(false);
  const [correspondence,setCorrespondence]=useState<{item:InsuranceCase;messages:InsuranceEmailExchange[];loading:boolean}|null>(null);

  const defaultTab = canUseApplicationQueue ? "applications" : canManageClaims ? "claims" : canManageRenewals ? "renewals" : canCatalog ? "partners" : "payments";
  const visibleTabs = [canUseApplicationQueue&&"applications", canManageClaims&&"claims", canManageRenewals&&"renewals", canCatalog&&"partners", canPaymentConfig&&"payments"].filter((value): value is string => Boolean(value));
  const requestedTab = searchParams.get("tab");
  const initialTab = requestedTab && visibleTabs.includes(requestedTab) ? requestedTab : defaultTab;
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
      canManageRenewals ? insuranceService.operationsRenewalJourneys() : Promise.resolve([]),
      canCatalog ? insuranceService.adminCompanies() : insuranceService.companies(),
      canReview ? insuranceService.operationsStaff() : Promise.resolve([]),
      canPaymentConfig ? insuranceService.insuranceAccounts() : Promise.resolve([]),
      canQuote ? insuranceService.quotationCompanies() : Promise.resolve([]),
    ]);

    const [summaryResult, casesResult, claimsResult, renewalsResult,renewalJourneysResult, companiesResult, staffResult,accountsResult,quotationCompaniesResult] = requests;
    if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
    if (casesResult.status === "fulfilled") setCases(pageContent<InsuranceCase>(casesResult.value));
    if (claimsResult.status === "fulfilled") setClaims(pageContent<InsuranceClaim>(claimsResult.value));
    if (renewalsResult.status === "fulfilled") setRenewals(pageContent<InsurancePolicy>(renewalsResult.value));
    if(renewalJourneysResult.status==="fulfilled")setRenewalJourneys(Array.isArray(renewalJourneysResult.value)?renewalJourneysResult.value:[]);
    if (companiesResult.status === "fulfilled") {
      const values = Array.isArray(companiesResult.value) ? companiesResult.value : [];
      setCompanies(values);
      if(canCatalog)setAdminCompanies(values as InsuranceCompanyAdmin[]);
      if(values[0])setPaymentConfiguration(current=>current.companyCode?current:{...current,companyCode:values[0].code});
    }
    if (staffResult.status === "fulfilled") setStaff(Array.isArray(staffResult.value) ? staffResult.value : []);
    if(accountsResult.status==="fulfilled")setAccounts((Array.isArray(accountsResult.value)?accountsResult.value:[]).filter(account=>account.category==="INSURANCE"&&account.active&&account.verified));
    if(quotationCompaniesResult.status==="fulfilled")setQuotationCompanies(Array.isArray(quotationCompaniesResult.value)?quotationCompaniesResult.value:[]);
    if (requests.some(result => result.status === "rejected")) toast.error("Some insurance queues could not be refreshed. Available data is still shown.");
    setLoading(false);
  }, [allowed, canCatalog, canManageClaims, canManageRenewals, canPaymentConfig, canQuote, canReport, canReview, canUseApplicationQueue]);

  const loadPaymentConfigurations=useCallback(async(code:string)=>{if(!canPaymentConfig||!code)return;try{setPaymentConfigurations(await insuranceService.adminPaymentConfigurations(code))}catch(error:unknown){toast.error(apiErrorMessage(error,"Payment routes could not be loaded."))}},[canPaymentConfig]);
  useEffect(()=>{const timer=window.setTimeout(()=>void loadPaymentConfigurations(paymentConfiguration.companyCode),0);return()=>window.clearTimeout(timer)},[loadPaymentConfigurations,paymentConfiguration.companyCode]);

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
    setQuoteFile(null);
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

  async function openEvidence(payment:InsurancePayment){setEvidence({payment,url:"",loading:true,error:""});try{const url=await insuranceService.paymentProof(payment.id);setEvidence({payment,url,loading:false,error:""})}catch(error:unknown){setEvidence({payment,url:"",loading:false,error:apiErrorMessage(error,"Payment evidence could not be opened.")})}}

  async function submitAction(event: FormEvent) {
    event.preventDefault();
    if (!action) return;
    switch (action.kind) {
      case "assign":
        return execute(() => insuranceService.assignCase(action.item.id, Number(adviserId)), "Application assigned.");
      case "case-status":
        return execute(() => insuranceService.updateCaseStatus(action.item.id, caseStatus, note || undefined), "Application status updated.");
      case "quote":
        setBusy(true);
        try {
          await insuranceService.addQuote(action.item.id, {
            ...quote,
            companyId: Number(quote.companyId),
            basePremium: Number(quote.basePremium),
            taxesLevies: Number(quote.taxesLevies),
            totalPremium: Number(quote.totalPremium),
            sourceExchangeId: quote.sourceExchangeId ? Number(quote.sourceExchangeId) : null,
          });
          if (quoteFile) await insuranceService.uploadDocument({caseId: action.item.id, category: "QUOTATION", file: quoteFile});
          toast.success(quoteFile ? "Draft quote and insurer document saved." : "Draft quote saved.");
          closeAction();
          await load();
        } catch (error: unknown) {
          toast.error(apiErrorMessage(error, "The insurer quote could not be saved. Check the figures and verified response."));
        } finally {
          setBusy(false);
        }
        return;
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

  function openPartner(value?:InsuranceCompanyAdmin){setEditingPartner(value?.code??null);setPartnerLogo(null);setPartner(value?{code:value.code,name:value.name,logoUrl:value.logoUrl??"",description:value.description??"",quotationEmail:value.quotationEmail??"",claimsEmail:value.claimsEmail??"",renewalsEmail:value.renewalsEmail??"",active:value.active}:blankPartner);setPartnerOpen(true)}
  async function savePartner(event:FormEvent){event.preventDefault();setBusy(true);try{const saved=editingPartner?await insuranceService.updateCompany(editingPartner,partner):await insuranceService.createCompany(partner);if(partnerLogo)await insuranceService.uploadCompanyLogo(saved.code,partnerLogo);toast.success(editingPartner?"Insurance partner updated.":"Insurance partner added.");setPartnerOpen(false);setPartnerLogo(null);await load()}catch(error:unknown){toast.error(apiErrorMessage(error,"The insurance partner could not be saved. Check the contact details and logo."))}finally{setBusy(false)}}
  async function deactivatePartner(){if(!editingPartner)return;await execute(()=>insuranceService.deactivateCompany(editingPartner),"Insurance partner deactivated. Historical quotes remain available.");setPartnerOpen(false)}
  async function addPaymentConfiguration(event:FormEvent){event.preventDefault();const payload={paymentAccountId:Number(paymentConfiguration.paymentAccountId),label:paymentConfiguration.label,instructions:paymentConfiguration.instructions,referenceTemplate:paymentConfiguration.referenceTemplate||null,effectiveFrom:paymentConfiguration.effectiveFrom};setBusy(true);try{await insuranceService.createPaymentConfiguration(paymentConfiguration.companyCode,payload);toast.success("Payment route activated.");setPaymentConfiguration(current=>({...blankPaymentConfiguration,companyCode:current.companyCode}));await loadPaymentConfigurations(paymentConfiguration.companyCode)}catch(error:unknown){toast.error(apiErrorMessage(error,"Payment route could not be saved."))}finally{setBusy(false)}}
  async function deactivatePaymentConfiguration(id:number){setBusy(true);try{await insuranceService.deactivatePaymentConfiguration(id);toast.success("Payment route deactivated.");await loadPaymentConfigurations(paymentConfiguration.companyCode)}catch(error:unknown){toast.error(apiErrorMessage(error,"Payment route could not be deactivated."))}finally{setBusy(false)}}
  async function openDispatch(item:InsuranceCase){setDispatchCase(item);setDispatchCompanies([]);setDispatchSentCompanies([]);setDispatchLoading(true);try{const history=await insuranceService.emailHistory(item.reference);const sent=[...new Set(history.filter(message=>message.direction==="OUTBOUND"&&message.messageType==="QUOTATION_REQUEST"&&["QUEUED","SENT"].includes(message.status)).map(message=>message.companyCode))];setDispatchSentCompanies(sent);setDispatchCompanies(sent)}catch(error:unknown){toast.error(apiErrorMessage(error,"Previous insurer requests could not be checked."))}finally{setDispatchLoading(false)}}
  async function dispatchQuoteRequest(event:FormEvent){event.preventDefault();if(!dispatchCase||dispatchCompanies.length<3)return;setBusy(true);try{await insuranceService.requestInsurerQuotes(dispatchCase.id,dispatchCompanies);toast.success(`Quotation request is active with ${dispatchCompanies.length} insurers. Replies will appear in correspondence.`);setDispatchCase(null);setDispatchCompanies([]);setDispatchSentCompanies([])}catch(error:unknown){toast.error(apiErrorMessage(error,"The proposal could not be sent. Select at least three active insurers with quotation email addresses."))}finally{setBusy(false)}}
  async function openCorrespondence(item:InsuranceCase){setCorrespondence({item,messages:[],loading:true});try{const messages=await insuranceService.emailHistory(item.reference);setCorrespondence({item,messages,loading:false})}catch(error:unknown){toast.error(apiErrorMessage(error,"Correspondence could not be loaded."));setCorrespondence(null)}}
  function createQuoteFromResponse(message:InsuranceEmailExchange){if(!correspondence)return;const company=companies.find(value=>value.code===message.companyCode);if(!company){toast.error("This insurer is no longer available in the partner directory.");return}setQuote({...blankQuote,companyId:String(company.id),currency:correspondence.item.currency||"KES",sourceExchangeId:String(message.id),validUntil:new Date(Date.now()+14*86400000).toISOString().slice(0,10)});setQuoteFile(null);setAction({kind:"quote",item:correspondence.item});setCorrespondence(null)}

  if (!allowed) return <AccessDenied/>;

  return <div className="min-h-screen bg-slate-50 p-4 sm:p-7">
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="link" asChild className="h-auto p-0"><Link href="/dashboard/insurance"><ArrowLeft className="mr-1 size-4"/>Customer hub</Link></Button>
          <div className="mt-2 flex items-center gap-4"><InsuranceBrandLogo src="/insurance/brands/silverwood.webp" name="Silverwood Insurance Agency" className="h-16 w-40 shrink-0"/><h1 className="text-3xl font-bold text-[#10243e]">Silverwood Insurance Operations</h1></div>
          <p className="text-muted-foreground">Controlled adviser and manager workflow with complete audit history.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`}/>Refresh</Button>
      </div>

      {canReport && <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value, Icon]) => <Card key={label}><CardContent className="flex items-center justify-between p-4"><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div><Icon className="size-7 text-[#1769aa]"/></CardContent></Card>)}
      </div>}
      {canReport&&<Card className="mt-6"><CardHeader><CardTitle>Operations workload</CardTitle></CardHeader><CardContent><DistributionChart ariaLabel="Insurance operations queue workload" data={[{label:"Applications open",value:summary.openCases},{label:"Applications unassigned",value:summary.unassignedCases},{label:"Payment verification queue",value:summary.paymentsAwaitingVerification},{label:"Claims open",value:summary.openClaims},{label:"Renewals approaching",value:summary.renewalsDue}]}/></CardContent></Card>}

      <Tabs key={initialTab} defaultValue={initialTab} className="mt-6">
        <TabsList>
          {canUseApplicationQueue && <TabsTrigger value="applications">Applications</TabsTrigger>}
          {canManageClaims && <TabsTrigger value="claims">Claims</TabsTrigger>}
          {canManageRenewals && <TabsTrigger value="renewals">Renewals</TabsTrigger>}
          {canCatalog && <TabsTrigger value="partners">Insurance companies</TabsTrigger>}
          {canPaymentConfig && <TabsTrigger value="payments">Payment routes</TabsTrigger>}
        </TabsList>
        {canUseApplicationQueue && <TabsContent value="applications" className="space-y-4"><ApplicationQueue items={cases} permissions={{canReview, canQuote, canApprove, canVerify, canIssue}} onAction={setAction} onEvidence={payment=>void openEvidence(payment)} onDispatch={item=>void openDispatch(item)} onHistory={item=>void openCorrespondence(item)}/></TabsContent>}
        {canManageClaims && <TabsContent value="claims" className="space-y-3"><ClaimQueue items={claims} onAction={item => {setClaimStatus(CLAIM_TRANSITIONS[item.status]?.[0] ?? "");setAction({kind: "claim-status", item});}}/></TabsContent>}
        {canManageRenewals && <TabsContent value="renewals" className="space-y-3"><RenewalOperations items={renewals} journeys={renewalJourneys} canVerify={canVerify} canIssue={canIssue} busy={busy} setBusy={setBusy} reload={load}/></TabsContent>}
        {canCatalog&&<TabsContent value="partners"><PartnerCatalog items={adminCompanies} onAdd={()=>openPartner()} onEdit={openPartner}/></TabsContent>}
        {canPaymentConfig&&<TabsContent value="payments"><PaymentRoutes companies={companies.filter(company=>company.active)} accounts={accounts} configurations={paymentConfigurations} form={paymentConfiguration} setForm={setPaymentConfiguration} busy={busy} onSubmit={addPaymentConfiguration} onDeactivate={deactivatePaymentConfiguration}/></TabsContent>}
      </Tabs>
    </div>
    <ActionDialog action={action} busy={busy} staff={staff} companies={companies} adviserId={adviserId} setAdviserId={setAdviserId} caseStatus={caseStatus} setCaseStatus={setCaseStatus} note={note} setNote={setNote} reference={reference} setReference={setReference} quote={quote} setQuote={setQuote} quoteFile={quoteFile} setQuoteFile={setQuoteFile} policy={policy} setPolicy={setPolicy} claimStatus={claimStatus} setClaimStatus={setClaimStatus} insurerReference={insurerReference} setInsurerReference={setInsurerReference} renewalStatus={renewalStatus} setRenewalStatus={setRenewalStatus} onClose={closeAction} onSubmit={submitAction}/>
    <Dialog open={Boolean(dispatchCase)} onOpenChange={open=>!open&&setDispatchCase(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><form onSubmit={dispatchQuoteRequest}><DialogHeader><DialogTitle>Request at least three quotations</DialogTitle><DialogDescription>Select three or more insurers. Each receives the same proposal with its own secure correlation ID; existing requests remain selected and are not sent twice.</DialogDescription></DialogHeader><div className="mt-5 space-y-3"><div className="rounded-lg border bg-slate-50 p-3 text-sm"><strong>{dispatchCompanies.length} selected</strong> · minimum 3</div>{dispatchLoading?<p className="text-sm text-muted-foreground">Checking previous requests…</p>:quotationCompanies.map(company=>{const alreadySent=dispatchSentCompanies.includes(company.code),checked=dispatchCompanies.includes(company.code);return <label key={company.code} className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${!company.readyForQuotations?"opacity-50":""}`}><span><strong>{company.name}</strong><span className="block text-xs text-muted-foreground">{alreadySent?"Request already sent":company.readyForQuotations?"Ready to receive quotations":"Quotation email required"}</span></span><input type="checkbox" checked={checked} disabled={alreadySent||!company.readyForQuotations} onChange={event=>setDispatchCompanies(current=>event.target.checked?[...new Set([...current,company.code])]:current.filter(code=>code!==company.code))}/></label>})}</div><DialogFooter className="mt-6"><Button type="button" variant="outline" onClick={()=>setDispatchCase(null)}>Cancel</Button><Button disabled={busy||dispatchLoading||dispatchCompanies.length<3}><Mail className="mr-2 size-4"/>{busy?"Sending…":`Send to ${dispatchCompanies.length} insurers`}</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={Boolean(correspondence)} onOpenChange={open=>!open&&setCorrespondence(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Insurer correspondence · {correspondence?.item.reference}</DialogTitle><DialogDescription>Inbound replies are mailbox-matched by correlation ID. A quote can be created only from a verified insurer response.</DialogDescription></DialogHeader><div className="mt-4 space-y-3">{correspondence?.loading?<p className="text-sm text-muted-foreground">Loading correspondence…</p>:correspondence?.messages.length?correspondence.messages.map(message=><div key={message.id} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-2"><strong>{message.companyName}</strong><Badge variant={message.status==="RECEIVED_VERIFIED"?"default":"secondary"}>{title(message.status)}</Badge></div><p className="mt-1 text-sm">{message.subject}</p><p className="mt-1 text-xs text-muted-foreground">{message.direction==="INBOUND"?"From":"To"}: {message.direction==="INBOUND"?message.senderAddress:message.recipientAddress} · {message.receivedAt||message.sentAt||"Queued"}</p>{message.body&&<p className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{message.body}</p>}{message.lastError&&<p className="mt-2 text-sm text-red-700">{message.lastError}</p>}{canQuote&&message.status==="RECEIVED_VERIFIED"&&message.direction==="INBOUND"&&<Button className="mt-3" size="sm" onClick={()=>createQuoteFromResponse(message)}>Create quote from verified response</Button>}</div>):<Empty text="No insurer correspondence has been recorded for this proposal."/>}</div><DialogFooter><Button variant="outline" onClick={()=>setCorrespondence(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(evidence)} onOpenChange={open=>!open&&setEvidence(null)}><DialogContent><DialogHeader><DialogTitle>Payment evidence</DialogTitle><DialogDescription>Evidence is opened through a short-lived secure link. Confirm the amount, destination, reference and payment time before making a decision.</DialogDescription></DialogHeader>{evidence?.loading?<p className="rounded-lg border p-4 text-sm text-muted-foreground">Preparing secure evidence…</p>:evidence?.error?<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{evidence.error}</p>:evidence?.url?<div className="space-y-3 rounded-lg border bg-slate-50 p-4 text-sm"><p><strong>Reference:</strong> {evidence.payment.paymentReference}</p><p><strong>File type:</strong> {evidence.payment.proofContentType??"Payment evidence"}</p><Button asChild><a href={evidence.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 size-4"/>Open secure evidence</a></Button><p className="text-xs text-muted-foreground">The link expires automatically and the internal storage location is never disclosed.</p></div>:null}<DialogFooter><Button variant="outline" onClick={()=>setEvidence(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
    <PartnerDialog open={partnerOpen} editing={Boolean(editingPartner)} value={partner} setValue={setPartner} logo={partnerLogo} setLogo={setPartnerLogo} busy={busy} onClose={()=>setPartnerOpen(false)} onSubmit={savePartner} onDeactivate={deactivatePartner}/>
  </div>;
}

function PartnerCatalog({items,onAdd,onEdit}:{items:InsuranceCompanyAdmin[];onAdd:()=>void;onEdit:(item:InsuranceCompanyAdmin)=>void}){return <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Insurance company maintenance</CardTitle><p className="mt-1 text-sm text-muted-foreground">Add, edit or deactivate approved insurers, branding and operational email destinations.</p></div><Button onClick={onAdd}><Plus className="mr-2 size-4"/>Add insurance company</Button></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map(item=><button type="button" key={item.code} onClick={()=>onEdit(item)} className="rounded-xl border p-4 text-left transition hover:border-[#1769aa] hover:shadow-sm"><InsuranceBrandLogo src={item.logoUrl} name={item.name}/><div className="mt-3 flex items-center justify-between gap-2"><strong>{item.name}</strong><Badge variant={item.active?"default":"secondary"}>{item.active?"Active":"Inactive"}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{item.quotationEmail||"Quotation email not configured"}</p></button>)}</div></CardContent></Card>}

function PaymentRoutes({companies,accounts,configurations,form,setForm,busy,onSubmit,onDeactivate}:{companies:InsuranceCompany[];accounts:InsuranceAccount[];configurations:InsurancePaymentConfiguration[];form:typeof blankPaymentConfiguration;setForm:(value:typeof blankPaymentConfiguration)=>void;busy:boolean;onSubmit:(event:FormEvent)=>void;onDeactivate:(id:number)=>void}){const [pending,setPending]=useState<InsurancePaymentConfiguration|null>(null);return <><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><Card><CardHeader><CardTitle>Configured payment routes</CardTitle></CardHeader><CardContent><Field label="Insurance partner"><Select value={form.companyCode} onValueChange={companyCode=>setForm({...form,companyCode})}><SelectTrigger><SelectValue placeholder="Select partner"/></SelectTrigger><SelectContent>{companies.map(company=><SelectItem key={company.code} value={company.code}>{company.name}</SelectItem>)}</SelectContent></Select></Field><div className="mt-4 space-y-3">{!configurations.length&&<Empty text="No payment routes configured for this partner."/>}{configurations.map(item=><div key={item.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><strong>{item.label}</strong><p className="text-sm text-muted-foreground">{item.accountName} · {title(item.channel)} · version {item.version}</p></div><Badge variant={item.active?"default":"secondary"}>{item.active?"Active":"Inactive"}</Badge></div><p className="mt-2 text-sm">{item.instructions}</p>{item.active&&<Button size="sm" variant="outline" className="mt-3" disabled={busy} onClick={()=>setPending(item)}>Deactivate</Button>}</div>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Add a verified payment route</CardTitle></CardHeader><CardContent><form onSubmit={onSubmit} className="space-y-4"><Field label="Verified Insurance account"><Select required value={form.paymentAccountId} onValueChange={paymentAccountId=>setForm({...form,paymentAccountId})}><SelectTrigger><SelectValue placeholder="Select payment account"/></SelectTrigger><SelectContent>{accounts.map(account=><SelectItem key={account.id} value={String(account.id)}>{account.name} · {title(account.channel)}</SelectItem>)}</SelectContent></Select>{!accounts.length&&<p className="text-xs text-amber-700">Create an Insurance account and have the SlickHood system owner verify it before activation.</p>}</Field><Field label="Customer label"><Input required maxLength={120} value={form.label} onChange={event=>setForm({...form,label:event.target.value})}/></Field><Field label="Payment instructions"><Textarea required maxLength={1500} value={form.instructions} onChange={event=>setForm({...form,instructions:event.target.value})}/></Field><Field label="Reference format (optional)"><Input maxLength={240} value={form.referenceTemplate} onChange={event=>setForm({...form,referenceTemplate:event.target.value})}/></Field><Field label="Effective from"><Input required type="date" min={new Date().toISOString().slice(0,10)} value={form.effectiveFrom} onChange={event=>setForm({...form,effectiveFrom:event.target.value})}/></Field><div className="flex flex-wrap gap-2"><Button disabled={busy||!accounts.length||!form.companyCode}>Activate route</Button><Button asChild type="button" variant="outline"><Link href="/dashboard/insurance/accounts"><Landmark className="mr-2 size-4"/>Manage accounts</Link></Button></div></form></CardContent></Card></div><Dialog open={Boolean(pending)} onOpenChange={open=>!open&&setPending(null)}><DialogContent><DialogHeader><DialogTitle>Deactivate this payment route?</DialogTitle><DialogDescription>Customers will no longer see {pending?.label}. Historical payment records and configuration versions remain intact.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={()=>setPending(null)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={()=>{if(pending)onDeactivate(pending.id);setPending(null)}}>Deactivate route</Button></DialogFooter></DialogContent></Dialog></>}

function PartnerDialog({open,editing,value,setValue,logo,setLogo,busy,onClose,onSubmit,onDeactivate}:{open:boolean;editing:boolean;value:typeof blankPartner;setValue:(value:typeof blankPartner)=>void;logo:File|null;setLogo:(file:File|null)=>void;busy:boolean;onClose:()=>void;onSubmit:(event:FormEvent)=>void;onDeactivate:()=>void}){return <Dialog open={open} onOpenChange={next=>!next&&onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><form onSubmit={onSubmit}><DialogHeader><DialogTitle>{editing?"Edit insurance company":"Add insurance company"}</DialogTitle><DialogDescription>Add the approved insurer identity and operational email destinations. Deactivation preserves historical quotations and audit records.</DialogDescription></DialogHeader><div className="mt-5 grid gap-4 sm:grid-cols-2">{!editing&&<Field label="Company code"><Input required pattern="[A-Z][A-Z0-9_]{1,49}" maxLength={50} value={value.code} onChange={event=>setValue({...value,code:event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g,"")})}/></Field>}<Field label="Display name"><Input required maxLength={160} value={value.name} onChange={event=>setValue({...value,name:event.target.value})}/></Field><div className="sm:col-span-2"><Field label="Insurance company logo"><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>setLogo(event.target.files?.[0]??null)}/>{logo&&<span className="text-xs text-muted-foreground">Selected: {logo.name}</span>}{!logo&&value.logoUrl&&<InsuranceBrandLogo src={value.logoUrl} name={value.name||"Insurance company"}/>}<span className="text-xs text-muted-foreground">JPG, PNG or WebP · maximum 2 MB.</span></Field></div><div className="sm:col-span-2"><Field label="Description"><Textarea maxLength={1000} value={value.description} onChange={event=>setValue({...value,description:event.target.value})}/></Field></div><Field label="Quotation email"><Input required type="email" value={value.quotationEmail} onChange={event=>setValue({...value,quotationEmail:event.target.value})}/></Field><Field label="Claims email"><Input type="email" value={value.claimsEmail} onChange={event=>setValue({...value,claimsEmail:event.target.value})}/></Field><Field label="Renewals email"><Input type="email" value={value.renewalsEmail} onChange={event=>setValue({...value,renewalsEmail:event.target.value})}/></Field>{editing&&<label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={value.active} onChange={event=>setValue({...value,active:event.target.checked})}/>Active company</label>}</div><DialogFooter className="mt-6">{editing&&value.active&&<Button type="button" variant="destructive" disabled={busy} onClick={onDeactivate}>Deactivate company</Button>}<Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy}><Settings2 className="mr-2 size-4"/>{busy?"Saving…":"Save company"}</Button></DialogFooter></form></DialogContent></Dialog>}

function ApplicationQueue({items, permissions, onAction,onEvidence,onDispatch,onHistory}: {items: InsuranceCase[]; permissions: {canReview: boolean; canQuote: boolean; canApprove: boolean; canVerify: boolean; canIssue: boolean}; onAction: (action: Action) => void;onEvidence:(payment:InsurancePayment)=>void;onDispatch:(item:InsuranceCase)=>void;onHistory:(item:InsuranceCase)=>void}) {
  if (!items.length) return <Empty text="No applications in the queue."/>;
  return items.map(item => <Card key={item.id}>
    <CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle>{item.reference} · {title(item.productCode)}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{item.fullName} · {item.phone} · {item.email}</p></div><Badge>{title(item.status)}</Badge></div></CardHeader>
    <CardContent>
      <p className="text-sm">{item.subjectDescription}</p>
      {item.riskDetails && <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">{item.riskDetails}</p>}
      {item.proposalData&&Object.keys(item.proposalData).length>0&&<details className="mt-3 rounded-lg border bg-slate-50 p-3 text-sm"><summary className="cursor-pointer font-medium">View proposal details</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(item.proposalData,null,2)}</pre></details>}
      <div className="mt-4 flex flex-wrap gap-2">
        {permissions.canReview && !item.assignedAdviserId && <Button size="sm" variant="outline" onClick={() => onAction({kind: "assign", item})}>Assign adviser</Button>}
        {permissions.canReview && ["SUBMITTED", "ADVISER_ASSIGNED"].includes(item.status) && <Button size="sm" variant="outline" onClick={() => onAction({kind: "case-status", item})}>Request information</Button>}
        {permissions.canQuote && ["SUBMITTED", "ADVISER_ASSIGNED", "INFORMATION_REQUIRED", "QUOTED"].includes(item.status) && <Button size="sm" variant="outline" onClick={() => onAction({kind: "quote", item})}>Add quote</Button>}
        {permissions.canQuote && ["SUBMITTED", "ADVISER_ASSIGNED", "INFORMATION_REQUIRED", "QUOTED"].includes(item.status) && <Button size="sm" variant="outline" onClick={()=>onDispatch(item)}><Mail className="mr-2 size-4"/>Send to insurer</Button>}
        {permissions.canReview&&<Button size="sm" variant="ghost" onClick={()=>onHistory(item)}><Inbox className="mr-2 size-4"/>Correspondence</Button>}
        {permissions.canApprove && item.quotes.filter(value => value.status === "DRAFT").map(value => <Button key={value.id} size="sm" onClick={() => onAction({kind: "approve-quote", item, quoteId: value.id, insurer: value.companyName})}>Approve {value.companyName}</Button>)}
        {permissions.canVerify && item.payments.filter(value => value.status === "PENDING_VERIFICATION").map(value => <span key={value.id} className="flex flex-wrap gap-2">{value.proofAvailable&&<Button size="sm" variant="outline" onClick={()=>onEvidence(value)}><Eye className="mr-2 size-4"/>Review evidence</Button>}<Button size="sm" disabled={!value.proofAvailable} onClick={() => onAction({kind: "payment-decision", item: value, decision: "VERIFIED"})}>Verify payment</Button><Button size="sm" variant="destructive" onClick={() => onAction({kind: "payment-decision", item: value, decision: "REJECTED"})}>Reject payment</Button></span>)}
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

type RenewalTask={mode:"offer"|"verify"|"reject"|"remit"|"complete";policy:InsurancePolicy;journey?:InsuranceRenewalJourney};
const renewalOfferBlank={quoteNumber:"",currency:"KES",basePremium:"",taxesLevies:"0",totalPremium:"",coverageSummary:"",exclusions:"",validUntil:"",coverStartDate:"",coverEndDate:""};
function RenewalOperations({items,journeys,canVerify,canIssue,busy,setBusy,reload}:{items:InsurancePolicy[];journeys:InsuranceRenewalJourney[];canVerify:boolean;canIssue:boolean;busy:boolean;setBusy:(value:boolean)=>void;reload:()=>Promise<void>}){
 const [task,setTask]=useState<RenewalTask|null>(null),[offer,setOffer]=useState(renewalOfferBlank),[reference,setReference]=useState(""),[reason,setReason]=useState(""),[evidence,setEvidence]=useState<{payment:InsuranceRenewalPayment;url:string;loading:boolean;error:string}|null>(null);
 const journey=(id:number)=>journeys.find(value=>value.policyId===id);
 const openOffer=(policy:InsurancePolicy)=>{const start=new Date(`${policy.endDate}T12:00:00`);start.setDate(start.getDate()+1);const end=new Date(start);end.setFullYear(end.getFullYear()+1);end.setDate(end.getDate()-1);setOffer({...renewalOfferBlank,coverStartDate:start.toISOString().slice(0,10),coverEndDate:end.toISOString().slice(0,10),validUntil:new Date(Date.now()+14*86400000).toISOString().slice(0,10)});setTask({mode:"offer",policy,journey:journey(policy.id)})};
 const run=async(work:()=>Promise<unknown>,message:string)=>{setBusy(true);try{await work();toast.success(message);setTask(null);setReference("");setReason("");await reload()}catch(error:unknown){toast.error(apiErrorMessage(error,"Renewal operation could not be completed."))}finally{setBusy(false)}};
 const submit=(event:FormEvent)=>{event.preventDefault();if(!task)return;const payment=task.journey?.payment;if(task.mode==="offer")return void run(()=>insuranceService.publishRenewalOffer(task.policy.id,{...offer,basePremium:Number(offer.basePremium),taxesLevies:Number(offer.taxesLevies),totalPremium:Number(offer.totalPremium)}),"Renewal offer published to the customer.");if(!payment&&task.mode!=="complete")return;if(task.mode==="verify")return void run(()=>insuranceService.decideRenewalPayment(payment!.id,"VERIFIED"),"Renewal payment verified.");if(task.mode==="reject")return void run(()=>insuranceService.decideRenewalPayment(payment!.id,"REJECTED",reason),"Renewal payment returned to the customer.");if(task.mode==="remit")return void run(()=>insuranceService.remitRenewalPayment(payment!.id,reference),"Renewal premium remittance recorded.");return void run(()=>insuranceService.completeRenewal(task.policy.id,reference),"Renewed policy issued.")};
 const review=async(payment:InsuranceRenewalPayment)=>{setEvidence({payment,url:"",loading:true,error:""});try{setEvidence({payment,url:await insuranceService.renewalProof(payment.id),loading:false,error:""})}catch(error:unknown){setEvidence({payment,url:"",loading:false,error:apiErrorMessage(error,"Renewal evidence could not be opened.")})}};
 if(!items.length)return <Empty text="No policies currently need renewal action."/>;
 return <>{items.map(policy=>{const j=journey(policy.id),payment=j?.payment;return <Card key={policy.id}><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{policy.policyNumber} · {policy.companyName}</h3><p className="text-sm text-muted-foreground">Ends {policy.endDate}</p>{j?.offer&&<p className="mt-1 text-sm">Offer {j.offer.quoteNumber} · {j.offer.currency} {j.offer.totalPremium.toLocaleString("en-KE")} · {title(j.offer.status)}</p>}</div><Badge>{title(policy.renewalStatus)}</Badge></div><div className="mt-4 flex flex-wrap gap-2">{["UPCOMING","CONTACTED","RENEWED"].includes(policy.renewalStatus)&&(!j?.offer||["COMPLETED","LAPSED","EXPIRED"].includes(j.offer.status))&&<Button size="sm" onClick={()=>openOffer(policy)}>Create renewal offer</Button>}{payment?.status==="PENDING_VERIFICATION"&&payment.proofAvailable&&canVerify&&<><Button size="sm" variant="outline" onClick={()=>void review(payment)}><Eye className="mr-2 size-4"/>Review renewal evidence</Button><Button size="sm" onClick={()=>setTask({mode:"verify",policy,journey:j})}>Verify renewal payment</Button><Button size="sm" variant="destructive" onClick={()=>setTask({mode:"reject",policy,journey:j})}>Reject renewal payment</Button></>}{payment?.status==="VERIFIED"&&canVerify&&<Button size="sm" onClick={()=>setTask({mode:"remit",policy,journey:j})}>Record renewal remittance</Button>}{payment?.status==="REMITTED"&&canIssue&&<Button size="sm" onClick={()=>{setReference(policy.policyNumber);setTask({mode:"complete",policy,journey:j})}}>Issue renewed policy</Button>}</div></CardContent></Card>})}<Dialog open={Boolean(task)} onOpenChange={open=>!open&&setTask(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><form onSubmit={submit}><DialogHeader><DialogTitle>{task?.mode==="offer"?"Create renewal offer":task?.mode==="verify"?"Verify renewal payment":task?.mode==="reject"?"Reject renewal payment":task?.mode==="remit"?"Record renewal remittance":"Issue renewed policy"}</DialogTitle><DialogDescription>Renewal changes are lifecycle-controlled and retained for audit.</DialogDescription></DialogHeader><div className="mt-5 space-y-4">{task?.mode==="offer"&&<><div className="grid gap-4 sm:grid-cols-2"><Field label="Renewal quote number"><Input required maxLength={80} value={offer.quoteNumber} onChange={e=>setOffer({...offer,quoteNumber:e.target.value})}/></Field><Field label="Currency"><Input required pattern="[A-Z]{3}" maxLength={3} value={offer.currency} onChange={e=>setOffer({...offer,currency:e.target.value.toUpperCase()})}/></Field><Field label="Base premium"><Input required type="number" min="0" step="0.01" value={offer.basePremium} onChange={e=>setOffer({...offer,basePremium:e.target.value})}/></Field><Field label="Taxes and levies"><Input required type="number" min="0" step="0.01" value={offer.taxesLevies} onChange={e=>setOffer({...offer,taxesLevies:e.target.value})}/></Field><Field label="Total renewal premium"><Input required type="number" min="0.01" step="0.01" value={offer.totalPremium} onChange={e=>setOffer({...offer,totalPremium:e.target.value})}/></Field><Field label="Offer valid until"><Input required type="date" min={new Date().toISOString().slice(0,10)} value={offer.validUntil} onChange={e=>setOffer({...offer,validUntil:e.target.value})}/></Field><Field label="New cover starts"><Input required type="date" value={offer.coverStartDate} onChange={e=>setOffer({...offer,coverStartDate:e.target.value})}/></Field><Field label="New cover ends"><Input required type="date" min={offer.coverStartDate} value={offer.coverEndDate} onChange={e=>setOffer({...offer,coverEndDate:e.target.value})}/></Field></div><Field label="Coverage summary"><Textarea required maxLength={12000} value={offer.coverageSummary} onChange={e=>setOffer({...offer,coverageSummary:e.target.value})}/></Field><Field label="Exclusions"><Textarea maxLength={12000} value={offer.exclusions} onChange={e=>setOffer({...offer,exclusions:e.target.value})}/></Field></>}{task?.mode==="verify"&&<p className="rounded-lg border bg-slate-50 p-4 text-sm">Confirm that the evidence matches the renewal premium, verified destination and reference.</p>}{task?.mode==="reject"&&<Field label="Rejection reason"><Textarea required maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></Field>}{task?.mode==="remit"&&<Field label="Insurer remittance reference"><Input required maxLength={120} value={reference} onChange={e=>setReference(e.target.value)}/></Field>}{task?.mode==="complete"&&<Field label="Renewed policy number"><Input required maxLength={120} value={reference} onChange={e=>setReference(e.target.value)}/></Field>}</div><DialogFooter className="mt-6"><Button type="button" variant="outline" onClick={()=>setTask(null)}>Cancel</Button><Button disabled={busy}>{busy?"Saving…":"Confirm"}</Button></DialogFooter></form></DialogContent></Dialog><Dialog open={Boolean(evidence)} onOpenChange={open=>!open&&setEvidence(null)}><DialogContent><DialogHeader><DialogTitle>Renewal payment evidence</DialogTitle><DialogDescription>Use this expiring link only for the authorised verification decision.</DialogDescription></DialogHeader>{evidence?.loading?<p>Preparing secure evidence…</p>:evidence?.error?<p role="alert" className="text-red-700">{evidence.error}</p>:evidence?.url?<Button asChild><a href={evidence.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 size-4"/>Open secure renewal evidence</a></Button>:null}<DialogFooter><Button variant="outline" onClick={()=>setEvidence(null)}>Close</Button></DialogFooter></DialogContent></Dialog></>;
}

function ActionDialog(props: {action: Action | null; busy: boolean; staff: InsuranceStaff[]; companies: InsuranceCompany[]; adviserId: string; setAdviserId: (value: string) => void; caseStatus: string; setCaseStatus: (value: string) => void; note: string; setNote: (value: string) => void; reference: string; setReference: (value: string) => void; quote: typeof blankQuote; setQuote: (value: typeof blankQuote) => void; quoteFile:File|null;setQuoteFile:(file:File|null)=>void;policy: {policyNumber: string; startDate: string; endDate: string}; setPolicy: (value: {policyNumber: string; startDate: string; endDate: string}) => void; claimStatus: string; setClaimStatus: (value: string) => void; insurerReference: string; setInsurerReference: (value: string) => void; renewalStatus: string; setRenewalStatus: (value: string) => void; onClose: () => void; onSubmit: (event: FormEvent) => void}) {
  const {action} = props;
  if (!action) return null;
  const heading = action.kind === "assign" ? "Assign insurance adviser" : action.kind === "case-status" ? "Update application" : action.kind === "quote" ? "Add insurer quotation" : action.kind === "approve-quote" ? "Approve customer quotation" : action.kind === "payment-decision" ? `${title(action.decision)} payment evidence` : action.kind === "remit" ? "Record insurer remittance" : action.kind === "issue-policy" ? "Issue policy" : action.kind === "claim-status" ? "Update claim" : "Update renewal";
  return <Dialog open onOpenChange={open => !open && props.onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><form onSubmit={props.onSubmit}><DialogHeader><DialogTitle>{heading}</DialogTitle><DialogDescription>Changes are validated by the insurance lifecycle and recorded in the audit history.</DialogDescription></DialogHeader><div className="mt-5 grid gap-4">
    {action.kind === "assign" && <Field label="Adviser"><Select required value={props.adviserId} onValueChange={props.setAdviserId}><SelectTrigger><SelectValue placeholder="Select an active adviser"/></SelectTrigger><SelectContent>{props.staff.map(person => <SelectItem key={`${person.id}-${person.roleName}`} value={String(person.id)}>{person.fullName || person.email} · {title(person.roleName)}</SelectItem>)}</SelectContent></Select></Field>}
    {action.kind === "case-status" && <><Field label="Next status"><Select value={props.caseStatus} onValueChange={props.setCaseStatus}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="INFORMATION_REQUIRED">Information required</SelectItem><SelectItem value="WITHDRAWN">Withdraw application</SelectItem></SelectContent></Select></Field><Field label="Reason or information required"><Textarea required maxLength={1000} value={props.note} onChange={event => props.setNote(event.target.value)}/></Field></>}
    {action.kind === "quote" && <QuoteFields companies={props.companies} quote={props.quote} setQuote={props.setQuote} quoteFile={props.quoteFile} setQuoteFile={props.setQuoteFile}/>}
    {action.kind === "approve-quote" && <p className="rounded-lg border bg-slate-50 p-4 text-sm">Publish the draft quotation from <strong>{action.insurer}</strong> to {action.item.fullName}? The customer will be notified.</p>}
    {action.kind === "payment-decision" && <><p className="rounded-lg border bg-slate-50 p-4 text-sm">Reference <strong>{action.item.paymentReference}</strong> · {action.item.currency} {action.item.amount.toLocaleString("en-KE")}</p>{action.decision === "REJECTED" && <Field label="Rejection reason"><Textarea required maxLength={500} value={props.note} onChange={event => props.setNote(event.target.value)}/></Field>}</>}
    {action.kind === "remit" && <Field label="Insurer remittance reference"><Input required maxLength={120} value={props.reference} onChange={event => props.setReference(event.target.value)}/></Field>}
    {action.kind === "issue-policy" && <><Field label="Policy number"><Input required maxLength={120} value={props.policy.policyNumber} onChange={event => props.setPolicy({...props.policy, policyNumber: event.target.value})}/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Cover starts"><Input required type="date" value={props.policy.startDate} onChange={event => props.setPolicy({...props.policy, startDate: event.target.value})}/></Field><Field label="Cover ends"><Input required type="date" min={props.policy.startDate || undefined} value={props.policy.endDate} onChange={event => props.setPolicy({...props.policy, endDate: event.target.value})}/></Field></div></>}
    {action.kind === "claim-status" && <><Field label="Next status"><Select required value={props.claimStatus} onValueChange={props.setClaimStatus}><SelectTrigger><SelectValue placeholder="Select next status"/></SelectTrigger><SelectContent>{(CLAIM_TRANSITIONS[action.item.status] ?? []).map(value => <SelectItem key={value} value={value}>{title(value)}</SelectItem>)}</SelectContent></Select></Field><Field label="Insurer reference (optional)"><Input maxLength={120} value={props.insurerReference} onChange={event => props.setInsurerReference(event.target.value)}/></Field><Field label="Case note"><Textarea maxLength={12000} value={props.note} onChange={event => props.setNote(event.target.value)}/></Field></>}
    {action.kind === "renewal-status" && <Field label="Next status"><Select required value={props.renewalStatus} onValueChange={props.setRenewalStatus}><SelectTrigger><SelectValue placeholder="Select next status"/></SelectTrigger><SelectContent>{(RENEWAL_TRANSITIONS[action.item.renewalStatus] ?? []).map(value => <SelectItem key={value} value={value}>{title(value)}</SelectItem>)}</SelectContent></Select></Field>}
  </div><DialogFooter className="mt-6"><Button type="button" variant="outline" onClick={props.onClose}>Cancel</Button><Button disabled={props.busy}>{props.busy ? "Saving…" : "Confirm"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function QuoteFields({companies, quote, setQuote,quoteFile,setQuoteFile}: {companies: InsuranceCompany[]; quote: typeof blankQuote; setQuote: (value: typeof blankQuote) => void;quoteFile:File|null;setQuoteFile:(file:File|null)=>void}) {
  return <>{quote.sourceExchangeId&&<p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">Verified insurer response linked to this quote.</p>}<div className="grid gap-4 sm:grid-cols-2"><Field label="Insurer"><Select required disabled={Boolean(quote.sourceExchangeId)} value={quote.companyId} onValueChange={companyId => setQuote({...quote, companyId})}><SelectTrigger><SelectValue placeholder="Select insurer"/></SelectTrigger><SelectContent>{companies.map(company => <SelectItem key={company.id} value={String(company.id)}>{company.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Quote number"><Input maxLength={80} value={quote.quoteNumber} onChange={event => setQuote({...quote, quoteNumber: event.target.value})}/></Field><Field label="Base premium"><Input required type="number" min="0" step="0.01" value={quote.basePremium} onChange={event => setQuote({...quote, basePremium: event.target.value})}/></Field><Field label="Taxes and levies"><Input required type="number" min="0" step="0.01" value={quote.taxesLevies} onChange={event => setQuote({...quote, taxesLevies: event.target.value})}/></Field><Field label="Total premium"><Input required type="number" min="0.01" step="0.01" value={quote.totalPremium} onChange={event => setQuote({...quote, totalPremium: event.target.value})}/></Field><Field label="Valid until"><Input required type="date" min={new Date().toISOString().slice(0, 10)} value={quote.validUntil} onChange={event => setQuote({...quote, validUntil: event.target.value})}/></Field></div><Field label="Insurer quotation document (optional)"><Input type="file" accept="application/pdf,image/jpeg,image/png" onChange={event=>setQuoteFile(event.target.files?.[0]??null)}/>{quoteFile&&<span className="text-xs text-muted-foreground">Selected: {quoteFile.name}</span>}</Field><Field label="Coverage summary"><Textarea required maxLength={12000} value={quote.coverageSummary} onChange={event => setQuote({...quote, coverageSummary: event.target.value})}/></Field><Field label="Excess details"><Textarea maxLength={1000} value={quote.excessDetails} onChange={event => setQuote({...quote, excessDetails: event.target.value})}/></Field><Field label="Exclusions"><Textarea maxLength={12000} value={quote.exclusions} onChange={event => setQuote({...quote, exclusions: event.target.value})}/></Field></>;
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
