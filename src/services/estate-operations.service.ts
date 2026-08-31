import { API } from "@/lib/api";

const page = { page: 0, size: 20 };
export const estateOperationsService = {
  meetings: (propertyId:number) => API.get(`/estate/operations/properties/${propertyId}/meetings`, { params: {...page, sort:"scheduledAt,desc"} }),
  resolutions: (meetingId:number) => API.get(`/estate/operations/meetings/${meetingId}/resolutions`, { params: {page:0,size:50,sort:"createdOn,asc"} }),
  budgets: (propertyId:number) => API.get(`/estate/operations/properties/${propertyId}/budgets`, { params: {...page, sort:"budgetYear,desc"} }),
  workOrders: (propertyId:number) => API.get(`/estate/operations/properties/${propertyId}/work-orders`, { params: {...page, sort:"createdOn,desc"} }),
  createMeeting: (data:{propertyId:number;title:string;scheduledAt:string;venue?:string;quorumRequired:number}) => API.post("/estate/operations/meetings",data),
  createBudget: (data:{propertyId:number;budgetYear:number;name:string;currency:string}) => API.post("/estate/operations/budgets",data),
  createWorkOrder: (data:{propertyId:number;areaName:string;title:string;description:string;category:string;priority:string;currency?:string}) => API.post("/estate/operations/work-orders",data),
  addBudgetLine: (budgetId:number,data:{category:string;description?:string;plannedAmount:number}) => API.post(`/estate/operations/budgets/${budgetId}/lines`,data),
  approveBudget: (budgetId:number) => API.put(`/estate/operations/budgets/${budgetId}/approve`),
  closeBudget: (budgetId:number) => API.put(`/estate/operations/budgets/${budgetId}/close`),
  recordActual: (lineId:number,actualAmount:number) => API.put(`/estate/operations/budget-lines/${lineId}/actual`,{actualAmount}),
  updateMeeting: (meetingId:number,data:{status:"HELD"|"CANCELLED";attendeeCount:number;minutes?:string}) => API.put(`/estate/operations/meetings/${meetingId}`,data),
  createResolution: (meetingId:number,data:{title:string;decision?:string;dueDate?:string}) => API.post(`/estate/operations/meetings/${meetingId}/resolutions`,data),
  updateResolution: (resolutionId:number,data:{status:"PASSED"|"REJECTED"|"IMPLEMENTED";votesFor:number;votesAgainst:number;votesAbstain:number;decision?:string}) => API.put(`/estate/operations/resolutions/${resolutionId}`,data),
  updateWorkOrder: (workId:number,data:{status:"ACKNOWLEDGED"|"IN_PROGRESS"|"COMPLETED"|"CANCELLED";assignedProviderServiceId?:number;scheduledAt?:string;estimatedCost?:number;actualCost?:number;resolutionNotes?:string}) => API.put(`/estate/operations/work-orders/${workId}`,data),
};

export interface EstateMeeting {id:number;propertyId:number;title:string;scheduledAt:string;venue?:string;status:string;quorumRequired:number;attendeeCount:number;minutes?:string}
export interface EstateResolution {id:number;meetingId:number;title:string;decision?:string;dueDate?:string;status:string;votesFor:number;votesAgainst:number;votesAbstain:number;implementedAt?:string}
export interface EstateBudgetLine {id:number;category:string;description?:string;plannedAmount:number;actualAmount:number}
export interface EstateBudgetView {budget:{id:number;propertyId:number;budgetYear:number;name:string;currency:string;status:string};lines:EstateBudgetLine[];plannedTotal:number;actualTotal:number}
export interface EstateCommonWork {id:number;propertyId:number;workOrderNumber:string;areaName:string;title:string;description:string;category:string;priority:string;status:string;currency?:string;estimatedCost?:number;actualCost?:number;scheduledAt?:string;resolutionNotes?:string}
