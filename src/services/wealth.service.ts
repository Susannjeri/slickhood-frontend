import {API} from "@/lib/api";

export type AssetPayload={propertyId?:number;assetType:string;name:string;reference?:string;location?:string;currency:string;acquisitionCost:number;acquisitionDate?:string;currentValue:number;valuationDate:string;status:string;exchangeCode?:string;instrumentSymbol?:string;quantity?:number;averageUnitCost?:number;pricingMode?:"MANUAL"|"MARKET"};
export type WealthPropertyOption={id:number;name:string;description?:string};
export const wealthService={
 dashboard:(years=5,valueGrowth=5,incomeGrowth=3,expenseGrowth=3)=>API.get("/wealth/dashboard",{params:{years,valueGrowth,incomeGrowth,expenseGrowth}}),
 assets:()=>API.get("/wealth/assets"),
 propertyOptions:()=>API.get("/wealth/property-options"),
 createAsset:(data:AssetPayload)=>API.post("/wealth/assets",data),
 updateAsset:(id:number,data:AssetPayload)=>API.put(`/wealth/assets/${id}`,data),
 archiveAsset:(id:number)=>API.delete(`/wealth/assets/${id}`),
 refreshMarket:(id:number)=>API.post(`/wealth/assets/${id}/market/refresh`),
 addValuation:(id:number,data:{amount:number;valuationDate:string;source:string;notes?:string})=>API.post(`/wealth/assets/${id}/valuations`,data),
 addCashFlow:(id:number,data:{flowType:"INCOME"|"EXPENSE";category:string;amount:number;entryDate:string;description?:string;recurring:boolean})=>API.post(`/wealth/assets/${id}/cash-flows`,data),
 updateCashFlow:(id:number,data:{flowType:"INCOME"|"EXPENSE";category:string;amount:number;entryDate:string;description?:string;recurring:boolean})=>API.put(`/wealth/cash-flows/${id}`,data),
 archiveCashFlow:(id:number)=>API.delete(`/wealth/cash-flows/${id}`),
 addLiability:(id:number,data:{lender:string;currency:string;originalPrincipal:number;outstandingPrincipal:number;annualInterestRate?:number;monthlyPayment?:number;startDate?:string;maturityDate?:string})=>API.post(`/wealth/assets/${id}/liabilities`,data),
 updateLiabilityBalance:(id:number,data:{outstandingPrincipal:number;monthlyPayment?:number;maturityDate?:string})=>API.put(`/wealth/liabilities/${id}/balance`,data),
 archiveLiability:(id:number)=>API.delete(`/wealth/liabilities/${id}`),
 addObligation:(id:number,data:{obligationType:string;title:string;effectiveDate?:string;dueDate?:string;expiryDate?:string;amount?:number;currency?:string;reminderDays:number;notes?:string})=>API.post(`/wealth/assets/${id}/obligations`,data),
 completeObligation:(id:number)=>API.post(`/wealth/obligations/${id}/complete`),
 reopenObligation:(id:number)=>API.post(`/wealth/obligations/${id}/reopen`),
 archiveObligation:(id:number)=>API.delete(`/wealth/obligations/${id}`),
 addGoal:(data:{goalType:string;name:string;targetAmount:number;currency:string;targetDate:string})=>API.post("/wealth/goals",data),
 archiveGoal:(id:number)=>API.delete(`/wealth/goals/${id}`),
 uploadDocument:(id:number,data:FormData)=>API.post(`/wealth/assets/${id}/vault`,data),
 documents:(id:number)=>API.get(`/wealth/assets/${id}/vault`),
 ledger:(id:number)=>API.get(`/wealth/assets/${id}/ledger`),
 vault:()=>API.get("/wealth/vault"),
 uploadVaultDocument:(data:FormData)=>API.post("/wealth/vault",data),
 archiveDocument:(id:number)=>API.delete(`/wealth/vault/${id}`),
};
