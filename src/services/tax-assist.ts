import {API} from "@/lib/api";

export type TaxRule = {id:number;ruleCode:string;version:number;effectiveFrom:string;effectiveTo?:string;rate:number;lowerThreshold?:number;upperThreshold?:number;currency:string;sourceUrl:string;sourceNote:string;active:boolean};
export type TaxCalculation = {id:number;calculationType:"MRI"|"CGT";taxPeriod:string;currency:string;grossAmount:number;taxableAmount:number;estimatedTax:number;creditAmount:number;estimatedPayable:number;outcome:string;explanation:string;dueDate?:string;rule:TaxRule;createdOn:string};
export type TaxConnection = {id:number;provider:"ETIMS"|"GAVACONNECT";taxpayerPinMasked:string;requestedScopes:string[];consentVersion:string;consentedAt:string;status:string;environment:string;reviewNote?:string;createdOn:string};
export type TaxAssistConfiguration = {estimatesEnabled:boolean;connectionRequestsEnabled:boolean;liveKraTransmissionEnabled:boolean;legalNoticeVersion:string;updatedBy?:number;updatedAt?:string};
type ApiEnvelope<T>={data:T;totalElements?:number};

export const estimateMri=async(payload:{period:string;kenyaResidentialProperty:boolean;residentTaxpayer:boolean;electedOutOfMri:boolean;projectedAnnualGrossRent:number;grossRentReceived:number;withholdingCredits:number})=>(await API.post<ApiEnvelope<TaxCalculation>>("/tax-assist/estimate/mri",payload)).data.data;
export const estimateCgt=async(payload:{transferDate:string;transferValue:number;transferCosts:number;acquisitionCost:number;acquisitionCosts:number;enhancementCosts:number;propertyDealer:boolean;potentialExemption:boolean;exemptionReason?:string})=>(await API.post<ApiEnvelope<TaxCalculation>>("/tax-assist/estimate/cgt",payload)).data.data;
export const taxHistory=async()=>(await API.get<ApiEnvelope<TaxCalculation[]>>("/tax-assist/calculations",{params:{size:30}})).data.data;
export const myTaxConnections=async()=>(await API.get<ApiEnvelope<TaxConnection[]>>("/tax-assist/connections")).data.data;
export const requestTaxConnection=async(payload:{provider:"ETIMS"|"GAVACONNECT";taxpayerPin:string;requestedScopes:string[];consentAccepted:boolean})=>(await API.post<ApiEnvelope<TaxConnection>>("/tax-assist/connections",payload)).data.data;
export const disconnectTaxConnection=(id:number)=>API.delete(`/tax-assist/connections/${id}`);
export const taxAssistConfiguration=async()=>(await API.get<ApiEnvelope<TaxAssistConfiguration>>("/tax-assist/configuration")).data.data;

export const adminTaxRules=async()=>(await API.get<ApiEnvelope<TaxRule[]>>("/tax-assist/admin/rules")).data.data;
export const createTaxRule=async(payload:{ruleCode:string;version:number;effectiveFrom:string;effectiveTo?:string;rate:number;lowerThreshold?:number;upperThreshold?:number;sourceUrl:string;sourceNote:string})=>(await API.post<ApiEnvelope<TaxRule>>("/tax-assist/admin/rules",payload)).data.data;
export const closeTaxRule=(id:number,effectiveTo:string)=>API.put(`/tax-assist/admin/rules/${id}/close`,{effectiveTo});
export const adminTaxConnections=async()=>(await API.get<ApiEnvelope<TaxConnection[]>>("/tax-assist/admin/connections",{params:{size:100}})).data.data;
export const reviewTaxConnection=(id:number,status:string,reviewNote:string)=>API.put(`/tax-assist/admin/connections/${id}/review`,{status,reviewNote});
export const updateTaxAssistConfiguration=async(payload:Pick<TaxAssistConfiguration,"estimatesEnabled"|"connectionRequestsEnabled"|"legalNoticeVersion">)=>(await API.put<ApiEnvelope<TaxAssistConfiguration>>("/tax-assist/admin/configuration",payload)).data.data;
