import { API } from "@/lib/api";
import { SaleMilestoneCreate, SaleStatus } from "@/types/business-workflows";

export const estateService = {
  listOwnership: (params: {page?:number;size?:number;propertyId?:number;active?:boolean} = {}) =>
    API.get("/estate/ownership", { params: { page: 0, size: 50, ...params } }),
  createOwnership: (data:{propertyId:number;unitId?:number;homeownerUserId:number;ownershipStart:string;source?:string}) => API.post("/estate/ownership",data),
  endOwnership: (id:number,data:{endDate:string;reason:string}) => API.post(`/estate/ownership/${id}/end`,data),
  listServiceCharges: (params: {page?:number;size?:number;propertyId?:number} = {}) =>
    API.get("/estate/service-charges",{params:{page:0,size:50,sort:"dueDate,desc",...params}}),
  createServiceCharge: (data:{ownershipId:number;amount:number;currency:string;dueDate:string;description:string}) => API.post("/estate/service-charges",data),
};
export const salesService = {
  list: (params:{page?:number;size?:number}={}) => API.get("/sales",{params:{page:0,size:25,...params}}),
  create: (data:{propertyId:number;unitId:number;buyerUserId?:number;buyerEmail?:string;askingPrice:number;currency:string;notes?:string}) => API.post("/sales",data),
  update: (id:number,data:{status:SaleStatus;offerAmount?:number;notes?:string}) => API.put(`/sales/${id}`,data),
  acceptOffer: (id:number) => API.post(`/sales/${id}/accept-offer`),
  milestones: (id:number,params:{page?:number;size?:number}={}) => API.get(`/sales/${id}/milestones`,{params:{page:0,size:50,...params}}),
  addMilestone: (id:number,data:SaleMilestoneCreate) => API.post(`/sales/${id}/milestones`,data),
};
