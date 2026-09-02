import {API} from "@/lib/api";
import {envelopeItem,envelopeList} from "@/lib/api-envelope";

export type InsuranceCompany={id:number;code:string;name:string;logoUrl?:string;description?:string;active:boolean};
export type InsuranceCompanyAdmin=InsuranceCompany&{quotationEmail?:string;claimsEmail?:string;renewalsEmail?:string};
export type InsuranceAgency={code:string;name:string;supportEmail?:string;supportPhone?:string;logoUrl?:string};
export type InsurancePaymentConfiguration={id:number;companyCode:string;companyName:string;paymentAccountId:number;accountName:string;channel:string;label:string;instructions:string;referenceTemplate?:string;version:number;effectiveFrom:string;effectiveTo?:string;active:boolean;accountVerified:boolean;paymentDetails:PaymentDetail[]};
export type InsuranceAccount={id:number;name:string;category:string;channel:string;active:boolean;verified:boolean};
export type PaymentDetail={key:string;label:string;description:string;value:string;displayField:boolean};
export type InsurancePaymentOption={id:number;companyCode:string;companyName:string;accountName:string;channel:string;label:string;instructions:string;referenceTemplate?:string;paymentDetails:PaymentDetail[]};
export type InsuranceProduct={code:string;name:string;description:string;subjectTypes:string[]};
export type InsuranceQuote={id:number;companyId:number;companyCode:string;companyName:string;quoteNumber?:string;status:string;currency:string;basePremium:number;taxesLevies:number;totalPremium:number;excessDetails?:string;coverageSummary:string;exclusions?:string;validUntil:string};
export type InsurancePayment={id:number;quoteId:number;paymentConfigurationId?:number;amount:number;currency:string;paymentReference:string;paidAt:string;status:string;rejectionReason?:string;remittanceReference?:string;remittedAt?:string;proofAvailable:boolean;proofContentType?:string};
export type InsuranceCase={id:number;reference:string;productCode:string;status:string;fullName:string;email:string;phone:string;subjectType:string;subjectDescription:string;sumInsured?:number;currency:string;coverStartDate?:string;riskDetails?:string;assignedAdviserId?:number;submittedAt:string;selectedQuoteId?:number;quotes:InsuranceQuote[];payments:InsurancePayment[]};
export type InsurancePolicy={id:number;caseId:number;policyNumber:string;companyName:string;productCode:string;status:string;startDate:string;endDate:string;renewalStatus:string};
export type InsuranceRenewalOffer={id:number;policyId:number;quoteNumber:string;currency:string;basePremium:number;taxesLevies:number;totalPremium:number;coverageSummary:string;exclusions?:string;validUntil:string;coverStartDate:string;coverEndDate:string;status:string};
export type InsuranceRenewalPayment={id:number;policyId:number;renewalOfferId:number;paymentConfigurationId:number;amount:number;currency:string;paymentReference:string;paidAt:string;status:string;rejectionReason?:string;remittanceReference?:string;remittedAt?:string;proofAvailable:boolean;proofContentType?:string};
export type InsuranceRenewalJourney={policyId:number;companyCode:string;offer?:InsuranceRenewalOffer;payment?:InsuranceRenewalPayment};
export type InsuranceClaim={id:number;policyId:number;policyNumber:string;reference:string;status:string;incidentAt:string;incidentLocation?:string;description:string;estimatedAmount?:number;insurerReference?:string;resolutionNotes?:string};
export type InsuranceDocument={id:number;caseId?:number;policyId?:number;claimId?:number;category:string;displayName:string;contentType:string;fileSize:number;checksumSha256:string;downloadUrl:string;versionNumber:number};
export type InsuranceOperationsSummary={openCases:number;unassignedCases:number;paymentsAwaitingVerification:number;openClaims:number;renewalsDue:number};
export type InsuranceStaff={id:number;fullName:string;email:string;roleName:string};
export type PageResult<T>={content:T[];totalElements:number;totalPages:number;number:number;size:number};

export const insuranceService={
 companies:async()=>envelopeList<InsuranceCompany>(await API.get("/insurance/companies")),
 agency:async()=>envelopeItem<InsuranceAgency>(await API.get("/insurance/agency"),{code:"SILVERWOOD",name:"Silverwood Insurance Agency"}),
 adminCompanies:async()=>envelopeList<InsuranceCompanyAdmin>(await API.get("/insurance/admin/companies")),
 createCompany:async(payload:Record<string,unknown>)=>envelopeItem<InsuranceCompanyAdmin>(await API.post("/insurance/admin/companies",payload),{} as InsuranceCompanyAdmin),
 updateCompany:async(code:string,payload:Record<string,unknown>)=>envelopeItem<InsuranceCompanyAdmin>(await API.put(`/insurance/admin/companies/${encodeURIComponent(code)}`,payload),{} as InsuranceCompanyAdmin),
 insuranceAccounts:async()=>envelopeList<InsuranceAccount>(await API.get("/account/list",{params:{byLandlord:true,size:100}})),
 adminPaymentConfigurations:async(code:string)=>envelopeList<InsurancePaymentConfiguration>(await API.get(`/insurance/admin/companies/${encodeURIComponent(code)}/payment-configurations`)),
 createPaymentConfiguration:async(code:string,payload:Record<string,unknown>)=>envelopeItem<InsurancePaymentConfiguration>(await API.post(`/insurance/admin/companies/${encodeURIComponent(code)}/payment-configurations`,payload),{} as InsurancePaymentConfiguration),
 deactivatePaymentConfiguration:(id:number)=>API.delete(`/insurance/admin/payment-configurations/${id}`),
 paymentOptions:async(companyCode:string)=>envelopeList<InsurancePaymentOption>(await API.get(`/insurance/companies/${encodeURIComponent(companyCode)}/payment-options`)),
 products:async()=>envelopeList<InsuranceProduct>(await API.get("/insurance/products")),
 cases:async()=>envelopeList<InsuranceCase>(await API.get("/insurance/cases")),
 createCase:async(payload:Record<string,unknown>)=>envelopeItem<InsuranceCase>(await API.post("/insurance/cases",payload),{} as InsuranceCase),
 withdrawCase:async(caseId:number)=>envelopeItem<InsuranceCase>(await API.post(`/insurance/cases/${caseId}/withdraw`),{} as InsuranceCase),
 selectQuote:async(caseId:number,quoteId:number)=>envelopeItem<InsuranceCase>(await API.post(`/insurance/cases/${caseId}/select-quote`,{quoteId}),{} as InsuranceCase),
 recordPayment:async(caseId:number,payload:Record<string,unknown>)=>envelopeItem<InsurancePayment>(await API.post(`/insurance/cases/${caseId}/payments`,payload),{} as InsurancePayment),
 uploadPaymentProof:async(paymentId:number,file:File)=>{const f=new FormData();f.append("file",file);return envelopeItem<InsurancePayment>(await API.post(`/insurance/payments/${paymentId}/proof`,f),{} as InsurancePayment)},
 paymentProof:async(paymentId:number)=>envelopeItem<string>(await API.get(`/insurance/payments/${paymentId}/proof`),""),
 policies:async()=>envelopeList<InsurancePolicy>(await API.get("/insurance/policies")),
 renewals:async()=>envelopeList<InsuranceRenewalJourney>(await API.get("/insurance/renewals")),
 requestRenewal:async(policyId:number)=>envelopeItem<InsuranceRenewalJourney>(await API.post(`/insurance/policies/${policyId}/renewal/request`),{} as InsuranceRenewalJourney),
 acceptRenewal:async(policyId:number)=>envelopeItem<InsuranceRenewalJourney>(await API.post(`/insurance/policies/${policyId}/renewal/accept`),{} as InsuranceRenewalJourney),
 recordRenewalPayment:async(policyId:number,payload:Record<string,unknown>)=>envelopeItem<InsuranceRenewalPayment>(await API.post(`/insurance/policies/${policyId}/renewal/payments`,payload),{} as InsuranceRenewalPayment),
 uploadRenewalProof:async(paymentId:number,file:File)=>{const f=new FormData();f.append("file",file);return envelopeItem<InsuranceRenewalPayment>(await API.post(`/insurance/renewal-payments/${paymentId}/proof`,f),{} as InsuranceRenewalPayment)},
 renewalProof:async(paymentId:number)=>envelopeItem<string>(await API.get(`/insurance/renewal-payments/${paymentId}/proof`),""),
 claims:async()=>envelopeList<InsuranceClaim>(await API.get("/insurance/claims")),
 createClaim:async(payload:Record<string,unknown>)=>envelopeItem<InsuranceClaim>(await API.post("/insurance/claims",payload),{} as InsuranceClaim),
 documents:async()=>envelopeList<InsuranceDocument>(await API.get("/insurance/documents")),
 uploadDocument:async(payload:{caseId?:number;policyId?:number;claimId?:number;category:string;file:File})=>{const f=new FormData();if(payload.caseId)f.append("caseId",String(payload.caseId));if(payload.policyId)f.append("policyId",String(payload.policyId));if(payload.claimId)f.append("claimId",String(payload.claimId));f.append("category",payload.category);f.append("file",payload.file);return envelopeItem<InsuranceDocument>(await API.post("/insurance/documents",f),{} as InsuranceDocument)},
 operationsSummary:async()=>envelopeItem<InsuranceOperationsSummary>(await API.get("/insurance/admin/operations/summary"),{openCases:0,unassignedCases:0,paymentsAwaitingVerification:0,openClaims:0,renewalsDue:0}),
 operationsStaff:async()=>envelopeList<InsuranceStaff>(await API.get("/insurance/admin/staff")),
 operationsCases:async(status?:string)=>envelopeItem<PageResult<InsuranceCase>>(await API.get("/insurance/admin/cases",{params:{status:status||undefined,size:100}}),{content:[],totalElements:0,totalPages:0,number:0,size:100}),
 operationsClaims:async(status?:string)=>envelopeItem<PageResult<InsuranceClaim>>(await API.get("/insurance/admin/claims",{params:{status:status||undefined,size:100}}),{content:[],totalElements:0,totalPages:0,number:0,size:100}),
 operationsRenewals:async()=>envelopeItem<PageResult<InsurancePolicy>>(await API.get("/insurance/admin/renewals",{params:{size:100}}),{content:[],totalElements:0,totalPages:0,number:0,size:100}),
 operationsRenewalJourneys:async()=>envelopeList<InsuranceRenewalJourney>(await API.get("/insurance/admin/renewal-journeys")),
 publishRenewalOffer:(policyId:number,payload:Record<string,unknown>)=>API.post(`/insurance/admin/policies/${policyId}/renewal-offer`,payload),
 decideRenewalPayment:(id:number,status:"VERIFIED"|"REJECTED",reason?:string)=>API.post(`/insurance/admin/renewal-payments/${id}/decision`,{status,reason}),
 remitRenewalPayment:(id:number,reference:string)=>API.post(`/insurance/admin/renewal-payments/${id}/remit`,{reference}),
 completeRenewal:(policyId:number,policyNumber:string)=>API.post(`/insurance/admin/policies/${policyId}/renewal-complete`,{policyNumber}),
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
