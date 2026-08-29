import {API} from "@/lib/api";

export type InsuranceCompany={id:number;code:string;name:string;logoUrl?:string;description?:string};
export type PaymentDetail={key:string;label:string;description:string;value:string;displayField:boolean};
export type InsurancePaymentOption={id:number;companyCode:string;companyName:string;accountName:string;channel:string;label:string;instructions:string;referenceTemplate?:string;paymentDetails:PaymentDetail[]};

export const insuranceService={
 companies:()=>API.get("/insurance/companies"),
 paymentOptions:(companyCode:string)=>API.get(`/insurance/companies/${encodeURIComponent(companyCode)}/payment-options`),
};
