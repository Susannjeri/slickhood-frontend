export interface PropertyOwnership {
  id: number; propertyId: number; unitId?: number; homeownerUserId: number;
  ownershipStart: string; ownershipEnd?: string; source?: string; active: boolean;
}
export interface EstateServiceCharge {id:number;propertyId:number;unitId:number;homeownerUserId:number;invoiceId:number;amount:number;currency:string;dueDate:string;description:string;}
export type SaleStatus = "LEAD"|"VIEWING"|"OFFERED"|"RESERVED"|"DUE_DILIGENCE"|"AGREEMENT"|"COMPLETION"|"COMPLETED"|"CANCELLED";
export interface SaleTransaction {
  id:number; propertyId:number; unitId?:number; salesAgentUserId:number; buyerUserId:number;
  status:SaleStatus; askingPrice:number; offerAmount?:number; currency:string; notes?:string;
  offerAcceptedAt?:string; completedAt?:string;
}
