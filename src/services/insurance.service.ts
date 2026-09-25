import {API} from "@/lib/api";
import {envelopeItem,envelopeList} from "@/lib/api-envelope";

export type InsuranceCompany={id:number;code:string;name:string;logoUrl?:string;description?:string;active:boolean};
export type InsuranceCompanyAdmin=InsuranceCompany&{quotationEmail?:string;claimsEmail?:string;renewalsEmail?:string};
export type InsuranceQuotationCompany={id:number;code:string;name:string;quotationEmail?:string;readyForQuotations:boolean};
export type InsuranceAgency={code:string;name:string;supportEmail?:string;supportPhone?:string;logoUrl?:string};
export type InsurancePaymentConfiguration={id:number;companyCode:string;companyName:string;paymentAccountId:number;accountName:string;channel:string;label:string;instructions:string;referenceTemplate?:string;version:number;effectiveFrom:string;effectiveTo?:string;active:boolean;accountVerified:boolean;paymentDetails:PaymentDetail[]};
export type InsuranceAccount={id:number;name:string;category:string;channel:string;active:boolean;verified:boolean};
export type PaymentDetail={key:string;label:string;description:string;value:string;displayField:boolean};
export type InsurancePaymentOption={id:number;companyCode:string;companyName:string;accountName:string;channel:string;label:string;instructions:string;referenceTemplate?:string;paymentDetails:PaymentDetail[]};
export type InsuranceProduct={code:string;name:string;description:string;subjectTypes:string[]};
export type MarineIdfOcrResult={idfNumber:string;importerName:string;importerPin:string;origin:string;portOfDischarge:string;hsCode:string;descriptionAndApplication:string;fobValue:string;transportMode:string;netMass:string;quantity:string;unitOfMeasure:string;confidence:number;reviewFields:string[];extractionReference:string};
export type InsuranceQuote={id:number;companyId:number;companyCode:string;companyName:string;companyLogoUrl?:string;quoteNumber?:string;status:string;currency:string;basePremium:number;taxesLevies:number;totalPremium:number;excessDetails?:string;coverageSummary:string;exclusions?:string;validUntil:string;sourceExchangeId?:number};
export type InsurancePayment={id:number;quoteId:number;paymentConfigurationId?:number;amount:number;currency:string;paymentReference:string;paidAt:string;status:string;rejectionReason?:string;remittanceReference?:string;remittedAt?:string;proofAvailable:boolean;proofContentType?:string};
export type InsuranceCase={id:number;reference:string;productCode:string;status:string;fullName:string;email:string;phone:string;subjectType:string;subjectDescription:string;sumInsured?:number;currency:string;coverStartDate?:string;riskDetails?:string;proposalData:Record<string,unknown>;assignedAdviserId?:number;assignmentOfferedAt?:string;adviserAcceptedAt?:string;adviserDeclinedAt?:string;adviserDeclineReason?:string;submittedAt:string;selectedQuoteId?:number;quotes:InsuranceQuote[];payments:InsurancePayment[]};
export type InsuranceEmailExchange={id:number;companyCode:string;companyName:string;caseReference:string;correlationId:string;messageType:string;direction:string;status:string;senderAddress:string;recipientAddress:string;subject:string;bodyHash:string;externalMessageId?:string;inReplyTo?:string;sentAt?:string;receivedAt?:string;lastError?:string;body?:string};
export type InsurancePolicy={id:number;caseId:number;policyNumber:string;companyName:string;productCode:string;status:string;startDate:string;endDate:string;renewalStatus:string};
export type InsuranceRenewalOffer={id:number;policyId:number;quoteNumber:string;currency:string;basePremium:number;taxesLevies:number;totalPremium:number;coverageSummary:string;exclusions?:string;validUntil:string;coverStartDate:string;coverEndDate:string;status:string};
export type InsuranceRenewalPayment={id:number;policyId:number;renewalOfferId:number;paymentConfigurationId:number;amount:number;currency:string;paymentReference:string;paidAt:string;status:string;rejectionReason?:string;remittanceReference?:string;remittedAt?:string;proofAvailable:boolean;proofContentType?:string};
export type InsuranceRenewalJourney={policyId:number;companyCode:string;offer?:InsuranceRenewalOffer;payment?:InsuranceRenewalPayment};
export type InsuranceClaim={id:number;policyId:number;policyNumber:string;reference:string;status:string;incidentAt:string;incidentLocation?:string;description:string;estimatedAmount?:number;insurerReference?:string;resolutionNotes?:string};
export type InsuranceDocument={id:number;caseId?:number;policyId?:number;claimId?:number;category:string;displayName:string;contentType:string;fileSize:number;checksumSha256:string;downloadUrl?:string|null;versionNumber:number};
export type InsuranceOperationsSummary={openCases:number;unassignedCases:number;paymentsAwaitingVerification:number;openClaims:number;renewalsDue:number};
export type InsuranceStaff={id:number;fullName:string;email:string;roleName:string};
export type PageResult<T>={content:T[];totalElements:number;totalPages:number;number:number;size:number};
export type InsuranceDeliveryChannel="EMAIL"|"SMS";
export type InsuranceGuestDeliveryOptions={email:boolean;sms:boolean};
export type InsuranceGuestChallenge={challengeId:string;message:string;deliveryChannel:InsuranceDeliveryChannel;maskedDestination:string;deliveryStatus:"QUEUED"|"DELIVERED"|"FAILED";resendAvailableAt:string};
export type InsuranceGuestDeliveryStatus={deliveryChannel:InsuranceDeliveryChannel;maskedDestination:string;deliveryStatus:"QUEUED"|"DELIVERED"|"FAILED";resendAvailableAt:string};
export type InsuranceGuestAccess={accessToken:string;expiresAt:string;caseId?:number};
export type InsuranceGuestCase={insuranceCase?:InsuranceCase;accountRequiredForPayment:boolean};

const guestHeaders=(accessToken:string)=>({"X-Insurance-Access":accessToken});

export const insuranceService={
 publicAgency:async()=>envelopeItem<InsuranceAgency>(await API.get("/public/insurance/agency"),{code:"SILVERWOOD",name:"Silverwood Insurance Agency"}),
 publicProducts:async()=>envelopeList<InsuranceProduct>(await API.get("/public/insurance/products")),
 publicCompanies:async()=>envelopeList<InsuranceCompany>(await API.get("/public/insurance/companies")),
 publicGuestDeliveryOptions:async()=>{const options=envelopeItem<InsuranceGuestDeliveryOptions|null>(await API.get("/public/insurance/access/channels"),null);if(!options||typeof options.email!=="boolean"||typeof options.sms!=="boolean")throw new Error("Delivery methods could not be confirmed");return options},
 requestGuestAccess:async(payload:{fullName:string;email:string;phone:string;deliveryChannel:InsuranceDeliveryChannel})=>envelopeItem<InsuranceGuestChallenge>(await API.post("/public/insurance/access/request",payload),{} as InsuranceGuestChallenge),
 resendGuestAccess:async(payload:{challengeId:string;deliveryChannel:InsuranceDeliveryChannel})=>envelopeItem<InsuranceGuestChallenge>(await API.post("/public/insurance/access/resend",payload),{} as InsuranceGuestChallenge),
 guestDeliveryStatus:async(challengeId:string)=>envelopeItem<InsuranceGuestDeliveryStatus>(await API.post("/public/insurance/access/status",{challengeId}),{} as InsuranceGuestDeliveryStatus),
 verifyGuestAccess:async(payload:{challengeId:string;code:string})=>envelopeItem<InsuranceGuestAccess>(await API.post("/public/insurance/access/verify",payload),{} as InsuranceGuestAccess),
 guestCase:async(accessToken:string)=>envelopeItem<InsuranceGuestCase>(await API.get("/public/insurance/case",{headers:guestHeaders(accessToken)}),{accountRequiredForPayment:true}),
 createGuestCase:async(accessToken:string,payload:Record<string,unknown>)=>envelopeItem<InsuranceGuestCase>(await API.post("/public/insurance/cases",payload,{headers:guestHeaders(accessToken)}),{accountRequiredForPayment:true}),
 selectGuestQuote:async(accessToken:string,caseId:number,quoteId:number)=>envelopeItem<InsuranceGuestCase>(await API.post(`/public/insurance/cases/${caseId}/select-quote`,{quoteId},{headers:guestHeaders(accessToken)}),{accountRequiredForPayment:true}),
 uploadGuestProposal:async(accessToken:string,caseId:number,file:File)=>{const f=new FormData();f.append("file",file);return envelopeItem<InsuranceDocument>(await API.post(`/public/insurance/cases/${caseId}/proposal`,f,{headers:guestHeaders(accessToken)}),{} as InsuranceDocument)},
 uploadGuestInvoice:async(accessToken:string,caseId:number,file:File)=>{const f=new FormData();f.append("file",file);return envelopeItem<InsuranceDocument>(await API.post(`/public/insurance/cases/${caseId}/invoice`,f,{headers:guestHeaders(accessToken)}),{} as InsuranceDocument)},
 extractGuestMarineIdf:async(accessToken:string,file:File)=>{const f=new FormData();f.append("file",file);return envelopeItem<MarineIdfOcrResult>(await API.post("/public/insurance/proposal-ocr/marine-idf",f,{headers:guestHeaders(accessToken)}),{} as MarineIdfOcrResult)},
 claimGuestCase:async(accessToken:string)=>envelopeItem<InsuranceCase>(await API.post("/insurance/cases/claim-guest",{accessToken}),{} as InsuranceCase),
 companies:async()=>envelopeList<InsuranceCompany>(await API.get("/insurance/companies")),
 agency:async()=>envelopeItem<InsuranceAgency>(await API.get("/insurance/agency"),{code:"SILVERWOOD",name:"Silverwood Insurance Agency"}),
 adminCompanies:async()=>envelopeList<InsuranceCompanyAdmin>(await API.get("/insurance/admin/companies")),
 createCompany:async(payload:Record<string,unknown>)=>envelopeItem<InsuranceCompanyAdmin>(await API.post("/insurance/admin/companies",payload),{} as InsuranceCompanyAdmin),
 updateCompany:async(code:string,payload:Record<string,unknown>)=>envelopeItem<InsuranceCompanyAdmin>(await API.put(`/insurance/admin/companies/${encodeURIComponent(code)}`,payload),{} as InsuranceCompanyAdmin),
 uploadCompanyLogo:async(code:string,file:File)=>{const f=new FormData();f.append("file",file);return envelopeItem<InsuranceCompanyAdmin>(await API.post(`/insurance/admin/companies/${encodeURIComponent(code)}/logo`,f),{} as InsuranceCompanyAdmin)},
 deactivateCompany:async(code:string)=>envelopeItem<InsuranceCompanyAdmin>(await API.delete(`/insurance/admin/companies/${encodeURIComponent(code)}`),{} as InsuranceCompanyAdmin),
 insuranceAccounts:async()=>envelopeList<InsuranceAccount>(await API.get("/account/list",{params:{byLandlord:true,size:100}})),
 adminPaymentConfigurations:async(code:string)=>envelopeList<InsurancePaymentConfiguration>(await API.get(`/insurance/admin/companies/${encodeURIComponent(code)}/payment-configurations`)),
 createPaymentConfiguration:async(code:string,payload:Record<string,unknown>)=>envelopeItem<InsurancePaymentConfiguration>(await API.post(`/insurance/admin/companies/${encodeURIComponent(code)}/payment-configurations`,payload),{} as InsurancePaymentConfiguration),
 deactivatePaymentConfiguration:(id:number)=>API.delete(`/insurance/admin/payment-configurations/${id}`),
 paymentOptions:async(companyCode:string)=>envelopeList<InsurancePaymentOption>(await API.get(`/insurance/companies/${encodeURIComponent(companyCode)}/payment-options`)),
 products:async()=>envelopeList<InsuranceProduct>(await API.get("/insurance/products")),
 extractMarineIdf:async(file:File)=>{const f=new FormData();f.append("file",file);return envelopeItem<MarineIdfOcrResult>(await API.post("/insurance/proposal-ocr/marine-idf",f),{} as MarineIdfOcrResult)},
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
 document:async(id:number)=>envelopeItem<InsuranceDocument>(await API.get(`/insurance/documents/${id}`),{} as InsuranceDocument),
 uploadDocument:async(payload:{caseId?:number;policyId?:number;claimId?:number;category:string;file:File})=>{const f=new FormData();if(payload.caseId)f.append("caseId",String(payload.caseId));if(payload.policyId)f.append("policyId",String(payload.policyId));if(payload.claimId)f.append("claimId",String(payload.claimId));f.append("category",payload.category);f.append("file",payload.file);return envelopeItem<InsuranceDocument>(await API.post("/insurance/documents",f),{} as InsuranceDocument)},
 operationsSummary:async()=>envelopeItem<InsuranceOperationsSummary>(await API.get("/insurance/admin/operations/summary"),{openCases:0,unassignedCases:0,paymentsAwaitingVerification:0,openClaims:0,renewalsDue:0}),
 operationsStaff:async()=>envelopeList<InsuranceStaff>(await API.get("/insurance/admin/staff")),
 operationsCases:async(status?:string)=>envelopeItem<PageResult<InsuranceCase>>(await API.get("/insurance/admin/cases",{params:{status:status||undefined,size:100}}),{content:[],totalElements:0,totalPages:0,number:0,size:100}),
 caseDocuments:async(caseId:number)=>envelopeList<InsuranceDocument>(await API.get(`/insurance/admin/cases/${caseId}/documents`)),
 operationsClaims:async(status?:string)=>envelopeItem<PageResult<InsuranceClaim>>(await API.get("/insurance/admin/claims",{params:{status:status||undefined,size:100}}),{content:[],totalElements:0,totalPages:0,number:0,size:100}),
 operationsRenewals:async()=>envelopeItem<PageResult<InsurancePolicy>>(await API.get("/insurance/admin/renewals",{params:{size:100}}),{content:[],totalElements:0,totalPages:0,number:0,size:100}),
 operationsRenewalJourneys:async()=>envelopeList<InsuranceRenewalJourney>(await API.get("/insurance/admin/renewal-journeys")),
 publishRenewalOffer:(policyId:number,payload:Record<string,unknown>)=>API.post(`/insurance/admin/policies/${policyId}/renewal-offer`,payload),
 decideRenewalPayment:(id:number,status:"VERIFIED"|"REJECTED",reason?:string)=>API.post(`/insurance/admin/renewal-payments/${id}/decision`,{status,reason}),
 remitRenewalPayment:(id:number,reference:string)=>API.post(`/insurance/admin/renewal-payments/${id}/remit`,{reference}),
 completeRenewal:(policyId:number,policyNumber:string,file:File)=>{const form=new FormData();form.append("data",new Blob([JSON.stringify({policyNumber})],{type:"application/json"}));form.append("file",file);return API.post(`/insurance/admin/policies/${policyId}/renewal-complete`,form)},
 assignCase:(id:number,adviserUserId:number)=>API.post(`/insurance/admin/cases/${id}/assign`,{adviserUserId}),
 assignmentDecision:(id:number,decision:"ACCEPTED"|"DECLINED",reason?:string)=>API.post(`/insurance/admin/cases/${id}/assignment-decision`,{decision,reason}),
 updateCaseStatus:(id:number,status:string,note?:string)=>API.post(`/insurance/admin/cases/${id}/status`,{status,note}),
 quotationCompanies:async()=>envelopeList<InsuranceQuotationCompany>(await API.get("/insurance/admin/quotation-companies")),
 addQuote:async(id:number,payload:Record<string,unknown>)=>envelopeItem<InsuranceQuote>(await API.post(`/insurance/admin/cases/${id}/quotes`,payload),{} as InsuranceQuote),
 requestInsurerQuotes:(caseId:number,companyCodes:string[])=>API.post(`/insurance/admin/cases/${caseId}/request-quotes`,{companyCodes}),
 emailHistory:async(caseReference:string)=>envelopeList<InsuranceEmailExchange>(await API.get(`/insurance/admin/cases/${encodeURIComponent(caseReference)}/email-history`)),
 publishQuote:(caseId:number,quoteId:number)=>API.post(`/insurance/admin/cases/${caseId}/quotes/${quoteId}/publish`),
 decidePayment:(id:number,status:"VERIFIED"|"REJECTED",reason?:string)=>API.post(`/insurance/admin/payments/${id}/decision`,{status,reason}),
 remitPayment:(id:number,reference:string)=>API.post(`/insurance/admin/payments/${id}/remit`,{reference}),
 issuePolicy:(caseId:number,payload:Record<string,unknown>,file:File)=>{const form=new FormData();form.append("data",new Blob([JSON.stringify(payload)],{type:"application/json"}));form.append("file",file);return API.post(`/insurance/admin/cases/${caseId}/policy`,form)},
 updateClaim:(id:number,payload:Record<string,unknown>)=>API.post(`/insurance/admin/claims/${id}/status`,payload),
 updateRenewal:(id:number,status:string)=>API.post(`/insurance/admin/policies/${id}/renewal`,{status}),
};
