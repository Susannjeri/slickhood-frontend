import { API } from "@/lib/api";
import { SaleStatus } from "@/types/business-workflows";

export const estateService = {
  listOwnership: () => API.get("/estate/ownership"),
  createOwnership: (data:{propertyId:number;unitId?:number;homeownerUserId:number;ownershipStart:string;source?:string}) => API.post("/estate/ownership",data),
  endOwnership: (id:number,endDate:string) => API.post(`/estate/ownership/${id}/end`,null,{params:{endDate}}),
  listServiceCharges: () => API.get("/estate/service-charges"),
  createServiceCharge: (data:{ownershipId:number;amount:number;currency:string;dueDate:string;description:string}) => API.post("/estate/service-charges",data),
};
export const salesService = {
  list: () => API.get("/sales"),
  create: (data:{propertyId:number;unitId?:number;buyerUserId:number;askingPrice:number;currency:string;notes?:string}) => API.post("/sales",data),
  update: (id:number,data:{status:SaleStatus;offerAmount?:number;notes?:string}) => API.put(`/sales/${id}`,data),
  acceptOffer: (id:number) => API.post(`/sales/${id}/accept-offer`),
};
