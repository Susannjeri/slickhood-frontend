import { API } from "@/lib/api";



export type GetVisitorsParams = {
  phone?: string;
};

export const getVisitors = (token: string, params?: GetVisitorsParams) => {
  return API.get("/visitor/list", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params,
  });
};

export type RegisterVisitorPayload = {
  visitorName: string;
  vehiclePlate: string;
  expectedArrivalTime: string;
  parkingLot: string;
  chargeable: boolean;
  unitId: number;
  visitorPhoneNumber: string;
  visitorCategory?: string;
  visitType: "WALK_IN" | "DRIVE_IN" | "DELIVERY";
  purpose?: string;
  companyName?: string;
  trackingNumber?: string;
  validUntil?: string;
  maxEntries?: number;
};

export const registerVisitor = (payload: RegisterVisitorPayload, token: string) => {
  return API.post("/visitor/access/register", payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export type VisitorCategory = {
  id: string;
  name: string;
};

export const getVisitorCategories = (token: string) => {
  return API.get("/visitor/category", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export type TenantUnit = {
  propertyName: string;
  unitId: number;
  propertyId: number;
  unitRef: string;
};

export const getTenantUnits = (token: string) => {
  return API.get("/property/unit/list/by/resident", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const cancelVisitor = (visitorId: number, token: string) => {
  return API.put(`/visitor/${visitorId}/cancel`, null, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const deleteVisitor = (visitorId: number, token: string) => {
  return API.delete(`/visitor/${visitorId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const toggleVisitorStatus = (visitorId: number, token: string) => {
  return API.patch(`/visitor/${visitorId}/status`, null, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const updateVisitorStatus = (id: number, status: "CHECKED_IN" | "CHECKED_OUT",token: string) => {
  return API.put(
    `/visitor/${id}/status`,
    { status },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

export const decideVisitor = (id: number, decision: "APPROVE" | "DENY", token: string) =>
  API.put(`/visitor/${id}/decision`, { decision }, { headers: { Authorization: `Bearer ${token}` } });

export type GuardHostOption = { unitId: number; unitRef: string; propertyId: number; propertyName: string; hostUserId: number; hostName: string };
export const getGuardHostOptions = (token: string) => API.get("/visitor/access/guard-options", { headers: { Authorization: `Bearer ${token}` } });
export const registerUnplannedVisit = (payload: RegisterVisitorPayload & { hostUserId: number }, token: string) =>
  API.post("/visitor/access/walk-in", payload, { headers: { Authorization: `Bearer ${token}` } });
