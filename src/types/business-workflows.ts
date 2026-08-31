export interface PropertyOwnership {
  id: number; propertyId: number; unitId?: number; homeownerUserId: number;
  propertyName: string; unitRef?: string; homeownerName: string; homeownerEmail: string;
  ownershipStart: string; ownershipEnd?: string; source?: string; terminationReason?: string; active: boolean;
}
export type ServiceChargeStatus = "DUE" | "OVERDUE" | "PAID";
export interface EstateServiceCharge {
  id:number; propertyId:number; propertyName:string; unitId:number; unitRef:string;
  homeownerUserId:number; invoiceId:number; invoiceRef:string; amount:number; currency:string;
  dueDate:string; description:string; paid:boolean; pendingAmount:number; status:ServiceChargeStatus; createdOn:string;
}
export type SaleStatus = "LEAD"|"VIEWING"|"OFFERED"|"RESERVED"|"DUE_DILIGENCE"|"AGREEMENT"|"COMPLETION"|"COMPLETED"|"CANCELLED";
export interface SaleTransaction {
  id:number; propertyId:number; propertyName?:string; unitId:number; unitRef?:string; salesAgentUserId:number; salesAgentName?:string; buyerUserId?:number; buyerName?:string; buyerEmail?:string; invitedBuyerEmail?:string;
  status:SaleStatus; askingPrice:number; offerAmount?:number; currency:string; notes?:string;
  offerAcceptedAt?:string; completedAt?:string;
}
export type SaleMilestoneType="ESCROW_FUNDED"|"DUE_DILIGENCE_CHECK"|"AGREEMENT_SIGNED"|"TRANSFER_REGISTERED"|"HANDOVER_COMPLETED";
export type SaleMilestoneStatus="PENDING"|"COMPLETED"|"FAILED";
export interface SaleMilestone {id:number;saleId:number;milestoneType:SaleMilestoneType;status:SaleMilestoneStatus;amount?:number;currency?:string;externalReference?:string;evidenceDocumentId?:number;notes?:string;occurredAt:string}
export interface SaleMilestoneCreate {type:SaleMilestoneType;status:SaleMilestoneStatus;amount?:number;externalReference?:string;evidenceDocumentId?:number;notes?:string}
