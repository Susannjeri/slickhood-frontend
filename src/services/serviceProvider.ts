
import { API } from "@/lib/api";

export type ServiceReadiness = { uploadedDocumentTypes: string[]; verifiedDocumentTypes: string[]; outstandingDocumentTypes: string[]; refereeCount: number; verifiedRefereeCount: number; requiredReferees: number };
export const getServiceReadiness = (token: string, serviceId: number) => API.get(`/sp/service/${serviceId}/readiness`, { headers: { Authorization: `Bearer ${token}` } });
export const editServiceProviderProfile = (token:string,payload:{businessName:string;consent:boolean;latitude:number;longitude:number}) => API.put("/sp/profile",payload,{headers:{Authorization:`Bearer ${token}`}});
export const editProviderService = (token:string,id:number,payload:{categoryId:number;amount:number;currency:string;pricingUnit:string}) => API.put(`/sp/service/${id}`,payload,{headers:{Authorization:`Bearer ${token}`}});
export const pauseProviderService = (token:string,id:number,pause:boolean) => API.put(`/sp/service/${id}/${pause?"pause":"resume"}`,{}, {headers:{Authorization:`Bearer ${token}`}});
export type ServiceReferee = {id:number;name:string;contact:string;verificationStatus:string};
export const listServiceReferees = (token:string) => API.get("/sp/referee/list",{params:{size:100},headers:{Authorization:`Bearer ${token}`}});
export const saveServiceReferee = (token:string,payload:{name:string;contact:string},id?:number) => id?API.put(`/sp/referee/${id}`,payload,{headers:{Authorization:`Bearer ${token}`}}):API.post("/sp/referee/add",payload,{headers:{Authorization:`Bearer ${token}`}});
export const removeServiceReferee = (token:string,id:number) => API.delete(`/sp/referee/${id}`,{headers:{Authorization:`Bearer ${token}`}});

export const createServiceCategory = (
    token: string,
    payload: {
        name: string;
        description: string;
        requiredDocumentTypes: string[];
        requiredNumberOfReferees?: number;
    }
) => {
    return API.post("/sp/admin/category/create", payload, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};

export const updateServiceCategory = (
    token: string,
    categoryId: number,
    payload: { name: string; description: string; requiredDocumentTypes: string[]; requiredNumberOfReferees?: number }
) => API.put(`/sp/admin/category/${categoryId}`, payload, { headers: { Authorization: `Bearer ${token}` } });

export const deleteServiceCategory = (token: string, categoryId: number) =>
    API.delete(`/sp/admin/category/${categoryId}`, { headers: { Authorization: `Bearer ${token}` } });

export const getAdminServiceCategories = (token: string, params?: {page?:number;size?:number;active?:boolean}) => API.get("/sp/admin/category/list",{params:{page:0,size:10,sort:"name,asc",...params},headers:{Authorization:`Bearer ${token}`}});
export const reactivateServiceCategory = (token:string,id:number) => API.put(`/sp/admin/category/${id}/reactivate`,{}, {headers:{Authorization:`Bearer ${token}`}});
export type AdminServiceDocument = {id:number;documentType:string;downloadUrl?:string;expiryDate?:string;verificationStatus:string};
export const getAdminServiceDocuments = (token:string,id:number,page=0) => API.get(`/sp/admin/document/${id}/list`,{params:{page,size:20},headers:{Authorization:`Bearer ${token}`}});
export const verifyAdminServiceDocument = (token:string,id:number,status:string) => API.put(`/sp/admin/document/${id}/verify`,{}, {params:{status},headers:{Authorization:`Bearer ${token}`}});
export const getAdminServiceReferees = (token:string,id:number,page=0) => API.get(`/sp/admin/referee/${id}/list`,{params:{page,size:20},headers:{Authorization:`Bearer ${token}`}});
export const verifyAdminServiceReferee = (token:string,id:number,status:string) => API.put(`/sp/admin/referee/${id}/verify`,{}, {params:{status},headers:{Authorization:`Bearer ${token}`}});
export const getAdminServiceTiers = (token:string) => API.get("/sp/admin/tier/list",{params:{size:100},headers:{Authorization:`Bearer ${token}`}});

export const getServiceDocumentTypes = (token: string) => {
    return API.get("/sp/admin/document/type/list", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};

// Get available service categories for Service Providers
export const getServiceCategories = (
    token: string,
    params?: {
        page?: number;
        size?: number;
        sort?: string;
    }
) => {
    return API.get("/sp/category/list", {
        params: {
            page: 0,
            size: 20,
            sort: "name,asc",
            ...params,
        },
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};

export const getServicePricingUnits = (token: string) => {
    return API.get("/sp/pricing/unit/list", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};

export const createService = (
    token: string,
    payload: {
        categoryId: number;
        amount: number;
        currency: string;
        pricingUnit: string;
    }
) => {
    return API.post("/sp/service/add", payload, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};

export const getServiceProviderProfile = (token: string) => {
    return API.get("/sp/profile", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};



export interface SetupServiceProviderProfilePayload {
    businessName: string;
    consent: boolean;
    consentIpAddress?: string; // Consent IP is recorded by the backend, not a third-party browser lookup.
    latitude: number;
    longitude: number;
}

export const setupServiceProviderProfile = (
    token: string,
    payload: SetupServiceProviderProfilePayload
) => {
    return API.post("/sp/profile/setup", payload, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};

export const uploadServiceDocument = (
    token: string,
    serviceId: number,
    payload: {
        file: File;
        documentType: string;
    }
) => {
    const formData = new FormData();

    formData.append("file", payload.file);
    formData.append("documentType", payload.documentType);

    return API.post(
        `/sp/document/${serviceId}/upload`,
        formData,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
};

export const submitServiceForReview = (
    token: string,
    serviceId: number
) => {
    return API.put(
        `/sp/service/${serviceId}/submit`,
        {},
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
};

export const getServiceProviderServices = (
    token: string,
    params?: {
        page?: number;
        size?: number;
        sort?: string;
    }
) => {
    return API.get("/sp/service/list", {
        params: {
            page: 0,
            size: 10,
            sort: "createdOn,desc",
            ...params,
        },
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};

// services/serviceProvider.ts — add these two

export const getServiceProviderDocuments = (
    token: string,
    serviceId: number,
    params?: {
        page?: number;
        size?: number;
        sort?: string;
    }
) => {
    return API.get(`/sp/document/${serviceId}/list`, {
        params: {
            page: 0,
            size: 50,
            ...params,
        },
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};

export const deleteService = (
    token: string,
    serviceId: number
) => {
    return API.delete(`/sp/service/${serviceId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};



// Fetch pending services awaiting admin approval
export const getPendingServices = (
  token: string,
  params?: { page?: number; size?: number; sort?: string }
) => {
  return API.get("/sp/admin/service/pending", {
    params: {
      page: 0,
      size: 20,
      sort: "createdOn,asc",
      ...params,
    },
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Fetch provider profile details by profile ID
export const getAdminProviderProfile = (token: string, profileId: number) => {
  return API.get(`/sp/admin/profile/${profileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Assign tier to a service
export const updateServiceTier = (token: string, serviceId: number, tier: string) => {
  return API.put(
    `/sp/admin/service/${serviceId}/tier`,
    {tier},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

// Fetch full service and provider details for review
export const getServiceDetails = (token: string, serviceId: number) => {
  return API.get(`/sp/admin/service/${serviceId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Approve service
export const approveService = (token: string, serviceId: number, notes?: string) => {
  return API.put(
    `/sp/admin/service/${serviceId}/approve`,
    {},
    { params: { adminNotes: notes }, headers: { Authorization: `Bearer ${token}` } }
  );
};

// Reject service
export const rejectService = (token: string, serviceId: number, reason: string) => {
  return API.put(
    `/sp/admin/service/${serviceId}/reject`,
    {},
    { params: { adminNotes: reason }, headers: { Authorization: `Bearer ${token}` } }
  );
};

export type MarketplaceService = {
  id:number; profileId:number; categoryId:number; categoryName:string; tier?:string;
  amount:number; currency:string; pricingUnit:string; serviceProviderName:string;
  latitude?:number; longitude?:number; riskLabel?:string;
};
export type ServiceBooking = {
  id:number; serviceId:number; bookedByUserId:number; scheduledAt:string; completedAt?:string;
  status:string; notes?:string; cancellationReason?:string; serviceName:string;
  serviceProviderName:string; bookedByUserName:string;
  quotedAmount?:number; currency?:string; pricingUnit?:string;
  propertyId?:number; unitId?:number; paymentAccountId?:number; paymentChannel?:string;
  invoiceRef?:string; paymentStatus?:string; providerReference?:string;
  refundStatus?:string; refundReference?:string; refundedAmount?:number;
  settlementStatus?:string; settlementReference?:string; settledAmount?:number;
  completionEvidenceReference?:string; startedAt?:string; customerBooking?:boolean;
};
export const searchMarketplace = (params?:{query?:string;categoryId?:number;minAmount?:number;maxAmount?:number;latitude?:number;longitude?:number;radiusKm?:number;page?:number;size?:number}) =>
  API.get("/sp/directory", {params:{page:0,size:24,sort:"amount,asc",...params}});
export const getMarketplaceService = (serviceId:number) => API.get(`/sp/directory/${serviceId}`);
export const createServiceBooking = (token:string,payload:{serviceId:number;scheduledAt:string;notes?:string;propertyId?:number;unitId?:number}) => API.post("/sp/booking/create",payload,{headers:{Authorization:`Bearer ${token}`}});
export const getMyServiceBookings = (token:string) => API.get("/sp/booking/my",{params:{size:100,sort:"createdOn,desc"},headers:{Authorization:`Bearer ${token}`}});
export const confirmServiceBooking = (token:string,id:number) => API.put(`/sp/booking/${id}/confirm`,{}, {headers:{Authorization:`Bearer ${token}`}});
export const startServiceBooking = (token:string,id:number) => API.put(`/sp/booking/${id}/start`,{}, {headers:{Authorization:`Bearer ${token}`}});
export const completeServiceBooking = (token:string,id:number,evidenceReference:string) => API.put(`/sp/booking/${id}/complete`,{evidenceReference}, {headers:{Authorization:`Bearer ${token}`}});
export const cancelServiceBooking = (token:string,id:number,reason?:string) => API.put(`/sp/booking/${id}/cancel`,{}, {params:{reason},headers:{Authorization:`Bearer ${token}`}});
export const setServiceProviderPaymentAccount = (token:string,paymentAccountId:number) => API.put("/sp/profile/payment-account",{paymentAccountId},{headers:{Authorization:`Bearer ${token}`}});
export const initiateServiceBookingPayment = (invoiceRef:string,accountId:number,paymentChannel:string,phoneNumber?:string) => API.post("/payment/init",{invoiceRef,accountId,paymentChannel,...(phoneNumber?{phoneNumber}:{})});
export const rateMarketplaceService = (token:string,payload:{bookingId:number;serviceId:number;stars:number;comment?:string}) => API.post("/sp/rating/submit",payload,{headers:{Authorization:`Bearer ${token}`}});
