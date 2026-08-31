import {API} from "@/lib/api";

export type InsuranceCompany={id:number;code:string;name:string;logoUrl?:string;description?:string};
export type PaymentDetail={key:string;label:string;description:string;value:string;displayField:boolean};
export type InsurancePaymentOption={id:number;companyCode:string;companyName:string;accountName:string;channel:string;label:string;instructions:string;referenceTemplate?:string;paymentDetails:PaymentDetail[]};
export type InsuranceProduct={code:string;name:string;description:string;subjectTypes:string[]};
export type InsuranceQuote={id:number;companyId:number;companyCode:string;companyName:string;quoteNumber?:string;status:string;currency:string;basePremium:number;taxesLevies:number;totalPremium:number;excessDetails?:string;coverageSummary:string;exclusions?:string;validUntil:string};
export type InsurancePayment={id:number;quoteId:number;amount:number;currency:string;paymentReference:string;paidAt:string;status:string;rejectionReason?:string;remittanceReference?:string;remittedAt?:string;proofAvailable:boolean};
export type InsuranceCase={id:number;reference:string;productCode:string;status:string;fullName:string;email:string;phone:string;subjectType:string;subjectDescription:string;sumInsured?:number;currency:string;coverStartDate?:string;riskDetails?:string;assignedAdviserId?:number;submittedAt:string;selectedQuoteId?:number;quotes:InsuranceQuote[];payments:InsurancePayment[]};
export type InsurancePolicy={id:number;caseId:number;policyNumber:string;companyName:string;productCode:string;status:string;startDate:string;endDate:string;renewalStatus:string};
export type InsuranceClaim={id:number;policyId:number;policyNumber:string;reference:string;status:string;incidentAt:string;incidentLocation?:string;description:string;estimatedAmount?:number;insurerReference?:string;resolutionNotes?:string};
export type InsuranceDocument={id:number;caseId?:number;policyId?:number;claimId?:number;category:string;displayName:string;contentType:string;fileSize:number;checksumSha256:string;downloadUrl:string;versionNumber:number};
export type InsuranceOperationsSummary={openCases:number;unassignedCases:number;paymentsAwaitingVerification:number;openClaims:number;renewalsDue:number};
export type InsuranceStaff={id:number;fullName:string;email:string;roleName:string};
export type PageResult<T>={content:T[];totalElements:number;totalPages:number;number:number;size:number};

type ApiEnvelope<T>={data?:{data?:T}};
const data=<T>(r:ApiEnvelope<T>,fallback:T)=>r.data?.data??fallback;

export const insuranceService={
 companies:()=>API.get("/insurance/companies"),
 paymentOptions:(companyCode:string)=>API.get(`/insurance/companies/${encodeURIComponent(companyCode)}/payment-options`),
 products:async()=>data<InsuranceProduct[]>(await API.get("/insurance/products"),[]),
 cases:async()=>data<InsuranceCase[]>(await API.get("/insurance/cases"),[]),
 createCase:async(payload:Record<string,unknown>)=>data<InsuranceCase>(await API.post("/insurance/cases",payload),{} as InsuranceCase),
 withdrawCase:async(caseId:number)=>data<InsuranceCase>(await API.post(`/insurance/cases/${caseId}/withdraw`),{} as InsuranceCase),
 selectQuote:async(caseId:number,quoteId:number)=>data<InsuranceCase>(await API.post(`/insurance/cases/${caseId}/select-quote`,{quoteId}),{} as InsuranceCase),
 recordPayment:async(caseId:number,payload:Record<string,unknown>)=>data<InsurancePayment>(await API.post(`/insurance/cases/${caseId}/payments`,payload),{} as InsurancePayment),
 uploadPaymentProof:async(paymentId:number,file:File)=>{const f=new FormData();f.append("file",file);return data<InsurancePayment>(await API.post(`/insurance/payments/${paymentId}/proof`,f),{} as InsurancePayment)},
 policies:async()=>data<InsurancePolicy[]>(await API.get("/insurance/policies"),[]),
 claims:async()=>data<InsuranceClaim[]>(await API.get("/insurance/claims"),[]),
 createClaim:async(payload:Record<string,unknown>)=>data<InsuranceClaim>(await API.post("/insurance/claims",payload),{} as InsuranceClaim),
 documents:async()=>data<InsuranceDocument[]>(await API.get("/insurance/documents"),[]),
 uploadDocument:async(payload:{caseId?:number;policyId?:number;claimId?:number;category:string;file:File})=>{const f=new FormData();if(payload.caseId)f.append("caseId",String(payload.caseId));if(payload.policyId)f.append("policyId",String(payload.policyId));if(payload.claimId)f.append("claimId",String(payload.claimId));f.append("category",payload.category);f.append("file",payload.file);return data<InsuranceDocument>(await API.post("/insurance/documents",f),{} as InsuranceDocument)},
 operationsSummary:async()=>data<InsuranceOperationsSummary>(await API.get("/insurance/admin/operations/summary"),{openCases:0,unassignedCases:0,paymentsAwaitingVerification:0,openClaims:0,renewalsDue:0}),
 operationsStaff:async()=>data<InsuranceStaff[]>(await API.get("/insurance/admin/staff"),[]),
 operationsCases:async(status?:string)=>data<PageResult<InsuranceCase>>(await API.get("/insurance/admin/cases",{params:{status:status||undefined,size:100}}),{content:[],totalElements:0,totalPages:0,number:0,size:100}),
 operationsClaims:async(status?:string)=>data<PageResult<InsuranceClaim>>(await API.get("/insurance/admin/claims",{params:{status:status||undefined,size:100}}),{content:[],totalElements:0,totalPages:0,number:0,size:100}),
 operationsRenewals:async()=>data<PageResult<InsurancePolicy>>(await API.get("/insurance/admin/renewals",{params:{size:100}}),{content:[],totalElements:0,totalPages:0,number:0,size:100}),
 assignCase:(id:number,adviserUserId:number)=>API.post(`/insurance/admin/cases/${id}/assign`,{adviserUserId}),
 updateCaseStatus:(id:number,status:string,note?:string)=>API.post(`/insurance/admin/cases/${id}/status`,{status,note}),
 addQuote:(id:number,payload:Record<string,unknown>)=>API.post(`/insurance/admin/cases/${id}/quotes`,payload),
 publishQuote:(caseId:number,quoteId:number)=>API.post(`/insurance/admin/cases/${caseId}/quotes/${quoteId}/publish`),
 decidePayment:(id:number,status:"VERIFIED"|"REJECTED",reason?:string)=>API.post(`/insurance/admin/payments/${id}/decision`,{status,reason}),
 remitPayment:(id:number,reference:string)=>API.post(`/insurance/admin/payments/${id}/remit`,{reference}),
 issuePolicy:(caseId:number,payload:Record<string,unknown>)=>API.post(`/insurance/admin/cases/${caseId}/policy`,payload),
 updateClaim:(id:number,payload:Record<string,unknown>)=>API.post(`/insurance/admin/claims/${id}/status`,payload),
 updateRenewal:(id:number,status:string)=>API.post(`/insurance/admin/policies/${id}/renewal`,{status}),
};
