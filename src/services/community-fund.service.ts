import { API } from "@/lib/api";

export type CommunityFund={id:number;propertyId:number;name:string;fundType:string;contributorScope:string;description:string;currency:string;targetAmount:number;defaultContribution:number;opensOn:string;dueDate:string;closesOn?:string;status:string;paymentAccountId:number;dualApprovalRequired:boolean};
export type FundContribution={id:number;contributorUserId:number;unitId:number;assessedAmount:number;paidAmount:number;invoiceId?:number;status:string;paidAt?:string;paymentReference?:string};
export type FundExpenditure={id:number;purpose:string;category:string;amount:number;beneficiaryType:string;beneficiaryName:string;beneficiaryReference?:string;status:string;paymentReference?:string;evidenceFileRef?:string;createdBy?:number};
export type FundTransaction={id:number;transactionType:string;amount:number;currency:string;description:string;beneficiaryName?:string;externalReference?:string;occurredAt:string};
export type FundDashboard={fund:CommunityFund;paymentAccount:{id:number;name:string;channel:string;active:boolean;verified:boolean};assessed:number;collected:number;committed:number;spent:number;available:number;contributorCount:number;paidContributorCount:number;myContributions:FundContribution[];contributions:FundContribution[];expenditures:FundExpenditure[];transactions:FundTransaction[];managerView:boolean};

export const communityFundService={
 list:()=>API.get("/community-funds"),
 dashboard:(id:number)=>API.get(`/community-funds/${id}`),
 create:(data:Record<string,unknown>)=>API.post("/community-funds",data),
 open:(id:number)=>API.post(`/community-funds/${id}/open`),
 pledge:(id:number,amount:number)=>API.post(`/community-funds/contributions/${id}/pledge`,{amount}),
 requestExpense:(fundId:number,data:Record<string,unknown>)=>API.post(`/community-funds/${fundId}/expenditures`,data),
 approve:(id:number)=>API.post(`/community-funds/expenditures/${id}/approve`),
 reject:(id:number,reason:string)=>API.post(`/community-funds/expenditures/${id}/reject`,{reason}),
 disburse:(id:number,paymentReference:string,evidenceFileRef?:string)=>API.post(`/community-funds/expenditures/${id}/disburse`,{paymentReference,evidenceFileRef}),
 accounts:()=>API.get("/account/list",{params:{byLandlord:true,size:100}}),
};
