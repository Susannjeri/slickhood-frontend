// src/lib/api.ts
import axios from "axios"
import { Channel } from "@/types";
import { useAuthStore } from "@/store/authStore";

export const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // e.g. http://localhost:8080
  withCredentials: false, // include cookies if backend uses them
})

export interface HelpDeskMessage {
  id: number;
  senderType: "USER" | "AI" | "AGENT" | "SYSTEM";
  content: string;
  createdOn: string;
  model?: string;
  sourceArticleIds?: string;
  internalNote: boolean;
}

export interface HelpDeskConversation {
  id: number;
  ticketNumber: string;
  subject: string;
  category: string;
  pageContext?: string;
  status: "OPEN" | "ESCALATED" | "ASSIGNED" | "WAITING_FOR_SUPPORT" | "WAITING_FOR_CUSTOMER" | "RESOLVED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  activeRole: string;
  assignedToUserId?: number;
  lastMessageAt: string;
  waitingSince?: string;
  slaDueAt?: string;
  slaBreachedAt?: string;
  firstResponseAt?: string;
  customerUnreadCount: number;
  agentUnreadCount: number;
  messages: HelpDeskMessage[];
}

export interface HelpDeskGuestSession {
  conversation: HelpDeskConversation;
  accessToken: string;
  expiresAt: string;
}
export interface HelpDeskSupportSummary { waitingForSupport: number; unassigned: number; slaBreached: number; waitingForCustomer: number }

export interface HelpDeskArticle {
  id: number;
  slug: string;
  title: string;
  category: string;
  body: string;
  keywords?: string;
  audienceRoles?: string;
  published: boolean;
}

export const listHelpConversations = (admin = false) =>
  API.get(admin ? "/helpdesk/admin/conversations?size=50" : "/helpdesk/conversations?size=50");
export const getHelpConversation = (conversationId: number, admin = false) =>
  API.get(admin ? `/helpdesk/admin/conversations/${conversationId}` : `/helpdesk/conversations/${conversationId}`);
export const getHelpDeskSupportSummary = () => API.get("/helpdesk/admin/summary");
export const createHelpConversation = (subject: string, category = "GENERAL", pageContext?: string) =>
  API.post("/helpdesk/conversations", { subject, category, pageContext });
export const sendHelpMessage = (conversationId: number, message: string, idempotencyKey = crypto.randomUUID()) =>
  API.post(`/helpdesk/conversations/${conversationId}/messages`, { message, idempotencyKey });
export const escalateHelpConversation = (conversationId: number, reason = "") =>
  API.post(`/helpdesk/conversations/${conversationId}/escalate`, { reason, priority: "NORMAL" });
export const reopenHelpConversation = (conversationId: number) => API.post(`/helpdesk/conversations/${conversationId}/reopen`);
export const listHelpArticles = (admin = false) => API.get(admin ? "/helpdesk/admin/articles" : "/helpdesk/articles");
export const replyToHelpConversation = (conversationId: number, message: string, idempotencyKey = crypto.randomUUID()) =>
  API.post(`/helpdesk/admin/conversations/${conversationId}/reply`, { message, idempotencyKey });
export const addHelpInternalNote = (conversationId: number, message: string) =>
  API.post(`/helpdesk/admin/conversations/${conversationId}/notes`, { message });
export const claimHelpConversation = (conversationId: number) => API.post(`/helpdesk/admin/conversations/${conversationId}/claim`);
export const resolveHelpConversation = (conversationId: number) =>
  API.post(`/helpdesk/admin/conversations/${conversationId}/resolve`);
export const saveHelpArticle = (article: Omit<HelpDeskArticle, "id">, id?: number) =>
  id ? API.put(`/helpdesk/admin/articles/${id}`, article) : API.post("/helpdesk/admin/articles", article);
export const createGuestHelpConversation = (subject: string, category: string, pageContext?: string) =>
  API.post("/helpdesk/public/conversations", { subject, category, pageContext });
export const getGuestHelpConversation = (ticketNumber: string, accessToken: string) =>
  API.get(`/helpdesk/public/conversations/${encodeURIComponent(ticketNumber)}`, { headers: { "X-Help-Token": accessToken } });
export const sendGuestHelpMessage = (ticketNumber: string, accessToken: string, message: string, idempotencyKey = crypto.randomUUID()) =>
  API.post(`/helpdesk/public/conversations/${encodeURIComponent(ticketNumber)}/messages`, { message, idempotencyKey }, { headers: { "X-Help-Token": accessToken } });
export const escalateGuestHelpConversation = (ticketNumber: string, accessToken: string) =>
  API.post(`/helpdesk/public/conversations/${encodeURIComponent(ticketNumber)}/escalate`, null, { headers: { "X-Help-Token": accessToken } });
export const listGuestHelpArticles = () => API.get("/helpdesk/public/articles");
export const claimGuestHelpConversation = (accessToken: string) => API.post("/helpdesk/guest/claim", null, { headers: { "X-Help-Token": accessToken } });

export type TeamMembershipStatus = "PENDING" | "ACCEPTED" | "KYC_PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED" | "SUSPENDED";
export type TeamScopeType = "ENTIRE_WORKSPACE" | "SELECTED_RESOURCES";
export interface TeamRoleOption { id: number; code: string; name: string; permissionTemplate: string }
export interface TeamResource { id: number; name: string; description?: string }
export interface TeamInvitation { id: number; email: string; role: string; roleName: string; scopeType: TeamScopeType; resourceIds: number[]; status: TeamMembershipStatus; expiresAt: string; resendCount: number }
export interface TeamMember { id: number; userId: number; email: string; name: string; role: string; roleName: string; scopeType: TeamScopeType; resourceIds: number[]; status: TeamMembershipStatus; acceptedAt?: string; activatedAt?: string }
export interface TeamWorkspace { id: number; name: string; businessArea: string; owner: boolean; seatLimit: number; seatsUsed: number; roles: TeamRoleOption[]; resources: TeamResource[]; invitations: TeamInvitation[]; members: TeamMember[] }
export type TeamBusinessArea = "LANDLORD" | "ESTATE_MANAGEMENT" | "PROPERTY_SALE_MANAGEMENT";
export type TeamPermissionTemplate = "WORKSPACE_ADMIN" | "PROPERTY_MANAGER" | "PROPERTY_ACCOUNTANT" | "LEASING_OFFICER" | "ESTATE_OPERATIONS_MANAGER" | "SECURITY_SUPERVISOR" | "GUARD" | "SALES_COORDINATOR" | "LISTING_AGENT" | "VIEWER";
export interface TeamRoleDefinition { id: number; code: string; displayName: string; description?: string; businessArea: TeamBusinessArea; permissionTemplate: TeamPermissionTemplate; active: boolean }
export interface TeamRoleDefinitionPayload { code: string; displayName: string; description?: string; businessArea: TeamBusinessArea; permissionTemplate: TeamPermissionTemplate }
export const getTeamWorkspace = () => API.get("/team-access");
export const inviteTeamMember = (payload: { email: string; roleDefinitionId: number; scopeType: TeamScopeType; resourceIds: number[] }) => API.post("/team-access/invitations", payload);
export const resendTeamInvitation = (id: number) => API.post(`/team-access/invitations/${id}/resend`);
export const revokeTeamInvitation = (id: number) => API.delete(`/team-access/invitations/${id}`);
export const updateTeamMemberScope = (id: number, payload: { scopeType: TeamScopeType; resourceIds: number[] }) => API.patch(`/team-access/members/${id}/scope`, payload);
export const suspendTeamMember = (id: number) => API.post(`/team-access/members/${id}/suspend`);
export const resumeTeamMember = (id: number) => API.post(`/team-access/members/${id}/resume`);
export const revokeTeamMember = (id: number) => API.delete(`/team-access/members/${id}`);
export const listTeamRoleDefinitions = () => API.get("/team-access/role-definitions");
export const createTeamRoleDefinition = (payload: TeamRoleDefinitionPayload) => API.post("/team-access/role-definitions", payload);
export const updateTeamRoleDefinition = (id: number, payload: TeamRoleDefinitionPayload) => API.put(`/team-access/role-definitions/${id}`, payload);
export const setTeamRoleDefinitionStatus = (id: number, active: boolean) => API.patch(`/team-access/role-definitions/${id}/status`, null, { params: { active } });

export interface ReportDefinition {
  code: string;
  title: string;
  description: string;
  category: string;
  supportsDateRange: boolean;
  availableToRoles: string[];
}

export interface OperationalReport {
  definition: ReportDefinition;
  from: string;
  to: string;
  generatedAt: string;
  metrics: Record<string, string | number>;
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
  truncated: boolean;
}

export const listReportCatalog = () => API.get("/reports/catalog");
export const generateReport = (code: string, from: string, to: string) =>
  API.get(`/reports/${encodeURIComponent(code)}`, { params: { from, to } });
export const exportReport = (code: string, from: string, to: string) =>
  API.get(`/reports/${encodeURIComponent(code)}/export`, { params: { from, to }, responseType: "blob" });

API.interceptors.request.use((config) => {
  const { token, activeRole } = useAuthStore.getState();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (activeRole?.title) {
    config.headers["X-Slickhood-Role"] = activeRole.title;
  }
  return config;
});

// Auth endpoints
export const loginUser = (data: { email: string; password: string; roleId?: number; token?: string }) =>
  API.post("/auth/login", data)

export type RegistrationProfileType = "INDIVIDUAL" | "COMPANY";
export const registerUser = (data: { email: string; password: string; fullName: string; profileType: RegistrationProfileType; organizationName?: string; roleId?: number; token?: string; referralCode?: string; referralCampaign?: string }) =>
  API.post("/auth/register", data)

export const googleRegister = (data: { idToken: string, roleId?: number, token?: string, profileType: RegistrationProfileType, organizationName?: string, referralCode?: string, referralCampaign?: string }) =>
  API.post("/auth/google", data)

export const googleLogin = (data: { idToken: string, token?: string }) =>
  API.post("/auth/google", data)

export const listRoles = () => API.get("/role/list")

export type InternalStaffRole =
  | "SUPPORT"
  | "SALES_MARKETING"
  | "FINANCE"
  | "INSURANCE_ADVISER"
  | "INSURANCE_MANAGER";
export const inviteInternalStaff = (email: string, role: InternalStaffRole, token: string) =>
  API.post("/user/staff/invite", { email, role }, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const selfAssignRole = (roleId: number, token: string) =>
  API.post(`/role/self-assign?roleId=${roleId}`, null, {
    headers: { Authorization: `Bearer ${token}` }
  })

export const getrefreshToken = (refreshToken: string) => API.post("/auth/refresh", { refreshToken })

export const logoutUser = (token: string) => API.get("/auth/logout", {
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
})

// export const getQRCode = (data: {email: string}) => 
//   API.get("/otp/qrcode?email=" + data.email)

export const getOTP = (data: {email: string, channel: Channel }) =>
  API.get("/otp/send?email=" + data.email + "&channel=" + data.channel)

export const validateTotp = (data: { code: string, email: string, channel: "EMAIL" | "GOOGLE_TOTP" | "SMS", password?:string }) => 
  API.post("/otp/verify", data)

export const verifyTOTP = (data: { totp: string }) =>
  API.post("/auth/verify-totp", data)

export const getVerificationOptions = (data: { email: string }) =>
  API.get("/otp/options?email=" + data.email)



// User endpoint
export interface SearchParams {
  sort?: string; 
  page?: number;
  size?: number;
}

export interface SearchParamswithFilter {
  sort?: string; 
  page?: number;
  size?: number;
  filter?: string;
}

export interface UserListParams {
  // 💡 'sort' is now explicitly optional in the interface
  sort?: string;
  page?: number;
  size?: number;
  search?: string;
  role?: string;
}

export interface UnitListParams {
  // 💡 'sort' is now explicitly optional in the interface
  sort?: string; 
  page?: number;
  size?: number;
  search?: string;
  propertyId?: number;
  leaseMode?: 'RENT' | 'SALE' | 'SERVICE_CHARGE' | ''; // Optional leaseMode
}

export interface AuditLogsParams {
  // 💡 'sort' is now explicitly optional in the interface
  sort?: string; 
  page?: number;
  size?: number;
  // search?: string;
  filter?: string;
}

export interface UnitJobsParams {
  // 💡 'sort' is now explicitly optional in the interface
  sort?: string;
  page?: number;
  size?: number;
}

export const fetchUserList = (
  // 🔑 Define defaults directly in the parameter object
  
  params: UserListParams = { 
    sort: 'id,desc', // Default sort is 'id,desc'
    page: 0, 
    size: 14, 
    search: '',
  },config: object = {}
) => {
  // Destructure the parameters, which will use the defaults if not provided by the caller
  const { sort, page, size, search } = params;
  
  // Construct the query string dynamically
  // The 'sort' parameter will be 'id,desc' if the user calls getUserList()
  // or it will be, for example, 'name,asc' if the user calls getUserList({ sort: 'name,asc' })
  const queryString = `?sort=${sort}&page=${page}&size=${size}&search=${search}`;
   return API.get(`/user/list${queryString}`, 
    config
);
}

// Property endpoints
export const createProperty = (data: {
  image: File;
  name: string;
  type: string;
  managementMode: "RENTAL" | "SALE" | "SERVICE_CHARGE";
  address: string;
  currency: string;
  mapLocation: string;
}, token: string) => {
  const formData = new FormData();
  formData.append("image", data.image);
  formData.append("name", data.name);
  formData.append("type", data.type);
  formData.append("managementMode", data.managementMode);
  formData.append("address", data.address);
  formData.append("currency", data.currency);
  formData.append("mapLocation", data.mapLocation);

  return API.post("/property/create", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`, // Include the token in the request headers
    },
  });
};


export const supportedPropertyTypes = () => {
  return API.get("/property/type", { 
    headers: { 
      'Content-Type': 'application/json'
     } });
}

export const fetchPropertyList = (
  // 🔑 Define defaults directly in the parameter object
  
  params: UserListParams = { 
    sort: 'id,desc', // Default sort is 'id,desc'
    page: 0, 
    size: 14, 
    search: '',
  },config: object = {}
) => {
  // Destructure the parameters, which will use the defaults if not provided by the caller
  const { sort, page, size, search, role } = params;
  const roleParam = role ? `&role=${encodeURIComponent(role)}` : "";
  const queryString = `?sort=${sort}&page=${page}&size=${size}&search=${search}${roleParam}`;
   return API.get(`/property/list${queryString}`, 
    config
);
}

export const viewProperty = (propertyId: number, config: object = {}) => {
  return API.get(`/property/list?propertyId=${propertyId}`, config ) }

export const editProperty = (data: {
  image: File;
  name: string;
  propertyId: number;
  type: string;
  address: string;
  currency: string;
  mapLocation: string;
}, token: string) => {
  const formData = new FormData();
  formData.append("image", data.image);
  formData.append("name", data.name);
  formData.append("propertyId", data.propertyId.toString());
  formData.append("type", data.type);
  formData.append("address", data.address);
  formData.append("currency", data.currency);
  formData.append("mapLocation", data.mapLocation);

  return API.put("/property/update", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`, // Include the token in the request headers
    },
  });
}

export const getImage = (imagePath: string, config:object={}) => {
  return API.get(`/property/image${imagePath}`,{ ...config, responseType: 'blob' } )
}

export const getImagePublic = (imagePath: string, inviteToken:string) => {
  return API.get(`/property/image${imagePath}?token=${inviteToken}`, { responseType: 'blob' } )
}



//Unit endpoints
// Property endpoints
export const createUnit = (data: {
  propertyId: number;
  uniqueRef: string;
  unitTypeId: string;
  size: string;
  measurementUnits: string;
  utilities: string;
  leaseMode: string;
  price: string;
  image: File;
  currency?: string;
  templateId?: number;
}, token: string) => {
  const formData = new FormData();
  formData.append("propertyId", data.propertyId.toString());
  formData.append("uniqueRef", data.uniqueRef);
  formData.append("unitType", data.unitTypeId);
  formData.append("size", data.size);
  formData.append("measurementUnits", data.measurementUnits);
  formData.append("utilities", data.utilities);
  formData.append("leaseMode", data.leaseMode);
  formData.append("price", data.price);
  formData.append("image", data.image);
  if (data.currency) {
    formData.append("currency", data.currency);
  }
  if (data.templateId) {
    formData.append("templateId", data.templateId.toString());
  }

  return API.post("/property/unit/create", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`, // Include the token in the request headers
    },
  });
};

export const getSupportedUnitTypes = (propertyType: string) => {
  return API.get(`property/unit/type?propertyType=${propertyType}`, {
    headers: {
      'Content-Type': 'application/json',
     } });
}

export const getSupportedUtilities = (token: string) => {
  return API.get("property/utilities", { 
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
     } });
}

export const getMeasurentUnits = (token: string) => {
  return API.get("property/measurement/units", { 
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
     } });
}

export const fetchUnitList = (
  // 🔑 Define defaults directly in the parameter object
  
  params: UnitListParams = { 
    sort: 'id,desc', // Default sort is 'id,desc'
    page: 0, 
    size: 14, 
    search: '',
    propertyId:0,
    leaseMode: '', // Default leaseMode is 'RENT'
  },config: object = {}
) => {
  // Destructure the parameters, which will use the defaults if not provided by the caller
  const { sort, page, size, propertyId, search, leaseMode } = params;
  // propertyId is omitted entirely (not sent as 0) when absent — this is
  // what drives the "all properties for this leaseMode" view. Sending a
  // literal propertyId=0 risks the backend treating it as a real property
  // id rather than "no filter"; omitting the param is the safer/standard
  // convention for an optional filter (unverified live, but consistent
  // with how other optional list filters in this codebase are handled).
  const propertyIdParam = propertyId ? `&propertyId=${propertyId}` : '';
  const queryString = `?sort=${sort}&page=${page}&size=${size}${propertyIdParam}&search=${search || ''}&leaseMode=${leaseMode || ''}`;
   return API.get(`/property/unit/list${queryString}`,
    config
);
}

export const viewUnit = (propertyId:number, unitId: number, token: string) => {
  return API.get(`/property/unit/list?propertyId=${propertyId}&unitId=${unitId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
     } 
    } 
  ) 
  }  

export const editUnit = (data: {
  propertyId: number;
  uniqueRef: string;
  unitTypeId: string;
  size: string;
  measurementUnits: string;
  utilities: string;
  leaseMode: string;
  price: string;
  images: File[];
  unitId: number;
  templateId?: number;
}, token: string) => {
  const formData = new FormData();
  formData.append("propertyId", data.propertyId.toString());
  formData.append("uniqueRef", data.uniqueRef);
  formData.append("unitType", data.unitTypeId);
  formData.append("size", data.size);
  formData.append("measurementUnits", data.measurementUnits);
  formData.append("utilities", data.utilities);
  formData.append("leaseMode", data.leaseMode);
  formData.append("price", data.price);
  formData.append("unitId", data.unitId.toString());
  if (data.templateId) {
    formData.append("templateId", data.templateId.toString());
  }

  data.images.forEach((img)=>{
    formData.append("images", img)
  });

  return API.put("/property/unit/update", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`, // Include the token in the request headers
    },
  });
};

export const uploadUnitImages = (data: {unitId: number, images: File[]}, token:string) => {
  const formData = new FormData();
  formData.append("unitId", String(data.unitId));

  data.images.forEach((image) => {
    formData.append("images", image); // 'images' must match backend field name
  });

  return API.put("/property/unit/images", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`
    },
  });
};

export const getUnit = (propertyId:number, unitId:number, token:string) => {

  return API.get(`/property/unit/list?propertyId=${propertyId}&unitId=${unitId}`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export const toggleAdvert = (unitId: number, token: string) => {
  return API.patch(`/property/unit/${unitId}/advertise-toggle`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

/*SuperAdmin*/
//Audit Logs
export const getAuditLogs = (
  params:AuditLogsParams={ 
    sort: 'id,desc', // Default sort is 'id,desc'
    page: 0, 
    size: 5, 
    // search: '',
    filter:"",
  }, token: string
) => {
  // Destructure the parameters, which will use the defaults if not provided by the caller
  const { sort, page, size, filter} = params;
  const queryString = `?sort=${sort}&page=${page}&size=${size}&filter=${filter}`;
   return API.get(`/audit/logs${queryString}`, 
    {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
);
}

export const createSimilarUnits = (unitId: number,count: number, token:string) => {
  return API.patch(`/property/unit/create/similar?unitId=${unitId}&count=${count}`,{
    headers: {
      "Content-Type": 'application/json', 
      Authorization: `Bearer ${token}`
    }
  })
}

export const getPendingUnits = (token:string) => {
  return API.get(`/property/unit/create/similar/count`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export const getCreateUnitJobs = (
  params:UnitJobsParams={ 
    sort: 'id,desc', // Default sort is 'id,desc'
    page: 0,
    size: 5, 
  }, token: string
) => {
  const { sort, page, size } = params;
  const queryString = `?sort=${sort}&page=${page}&size=${size}`;
   return API.get(`/property/unit/create/similar/list${queryString}`, 
    {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
);
}

/*Configs*/

export const getConfigNames = (token:string) => {
  return API.get(`/config/names`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export const getConfigValues = (name:string, token:string) => {
  return API.get(`/config/value?name=${name}`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export const decryptConfigValue = (name:string, token:string) => {
  return API.get(`/config/value/decrypt?name=${name}`, {
    headers: {
      "Content-Type": 'application/json', 
      Authorization: `Bearer ${token}`
    }
  })
}

export const editConfigValue = (data:{config:string, value:string}, token:string) => {
  return API.put(`/config/update`, data, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

/*Params*/
export const getSupportedParams = (token:string) => {
  return API.get(`/param/type`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export type PaymentType = "M-Pesa" | "Flutterwave";

export interface Param {
  param: string;
  value: string;
}

export const createParam = (name:string, type:PaymentType, params:Param[], token:string) => {
  return API.post(`/param/create`, { name, type, params }, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export const listUserParams = (token: string) => {  
  return API.get(`/param/user/params`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export const editParam = (name: string, type: PaymentType, params: Param[], token: string) => {
  return API.put(`/param/update`, { name, type, params }, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export const deleteParams = (name: string, token: string) => {
  return API.delete (`param/delete/${name}`,{
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export const decryptParams = (name: string, token: string) => {
  return API.get(`/param/user/params/decrypt?groupName=${name}`,
    { headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    } }
  )
}

export const verifyParams = (groupName: string, verify:boolean, token: string) => {
  return API.patch(`/param/verify`,{}, { params: { groupName, verify },
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    } }
  )
}

export interface GetAllParamsOptions {
  sort?: string;    // e.g. "name,desc"
  page?: number;    // e.g. 0
  size?: number;    // e.g. 10
  filter?: string;  // optional filter text
}

export const getAllParams = (
  options: GetAllParamsOptions,
  token: string
) => {
  const { sort = "name,desc", page = 0, size = 2, filter = "" } = options;
  const queryString = `?sort=${sort}&page=${page}&size=${size}&filter=${filter}`;
  return API.get(`/param/all/params${queryString}`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  });
}

/*Charges*/
export const getFeeTypes = (token:string) => {
  return API.get(`property/charge/types`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export const getperiodTypes = (token:string) => {
  return API.get(`property/period/types`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export const getUnitCharges = (unitId:number, token:string) => {
  return API.get(`property/unit/charges?unitId=${unitId}`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export const getUnitChargesPublic = (unitId:number,inviteToken:string) => {
  return API.get(`property/unit/charges?unitId=${unitId}&token=${inviteToken}`)
}


export type ChargePeriod = "ONE_TIME" | "MONTHLY" | "ANNUAL";


export interface ChargeItem {
  chargeId: number;
  period: ChargePeriod;
  amount: number;
}

export interface UpdateChargesBody {
  unitId: number;
  charges: ChargeItem[];
}

export const updateUnitCharges = (body: UpdateChargesBody, token: string) => {
  return API.post(`/property/unit/charges`, body, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}
/* notifications */
export interface NotificationParams {
  sort?: string; 
  page?: number;
  size?: number;
  filter?: string;
}

export const listNotifications = (
  params: NotificationParams = { 
    sort: 'id,desc', 
    page: 0,
    size: 10, 
    filter: '',
  }, token: string
) => {
  const { sort, page, size, filter } = params;
  const queryString = `?sort=${sort}&page=${page}&size=${size}&filter=${filter}`;
    return API.get(`/notification/list${queryString}`,
    {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
);
}

/*Invites*/
export const createInvite = (data: { inviteType: string; entityId: number }, token: string) => {
  return API.post("/invite/new", data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // Include the token in the request headers
    },
  });
}

export const listInvites = (
  params: SearchParams = {
    sort: 'id,desc',  
    page: 0,
    size: 10, 
  }, token: string
) => {
  const { sort, page, size } = params;
  const queryString = `?sort=${sort}&page=${page}&size=${size}`;
    return API.get(`/invite/list${queryString}`,
    {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
);
}

export interface UnitInviteSearchParams {
  sort?: string; 
  page?: number;
  size?: number;
}
export const listUnitInvites = (
  unitId: number,
  params: UnitInviteSearchParams = {}, 
  token: string
) => {
  const { 
    sort='id,desc', 
    page=0, 
    size=10,
   } = params;
  const queryString = `?sort=${sort}&page=${page}&size=${size}&unitId=${unitId}`;
    return API.get(`/invite/list${queryString}`,
    {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
);
}

export const shareInvite = (inviteId: number, recipient: string, notificationChannel: "EMAIL" | "SMS", token: string) => {
  return API.post("/invite/share", { inviteId, recipient, notificationChannel }, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // Include the token in the request headers
    },
  });
}

export const validateInviteToken = (inviteToken: string, token?: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return API.get(`/invite/validate?token=${inviteToken}`, headers);
}

export const viewInviteUnit = (inviteToken: string) => {
  return API.get(`/invite/unit/view?token=${inviteToken}`, {  
    headers: {
      "Content-Type": "application/json", 
    },
  });
}

export const supportedInvites = (token: string) => {
  return API.get("/invite/types", { 
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
     } });
}

export interface UpdateInviteParams {
  id?: number;
  active?: boolean;
}
export const updateInvite = (data: UpdateInviteParams, token: string) => {
  const { id, active } = data;
  return API.patch(`/invite/update?id=${id}&active=${active}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // Include the token in the request headers
    },
  });
}

export const getStaffAndInvites = (propertyId: number, token: string) => {
  return API.get(`/property/staff?propertyId=${propertyId}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // Include the token in the request headers
    },
  });
}

export const deleteStaff = (staffId: number, token: string) => {
  return API.delete(`/property/staff?staffId=${staffId}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // Include the token in the request headers
    },
  });
}
/*onboarding */
export const registerInviteAssignedRole = (data: { email: string; password: string, token:string, roleId: number }) =>
  API.post("/auth/register", data)

/*User Details*/
export const userDetails = (token: string) => 
  API.get("/user/details", { headers: { Authorization: `Bearer ${token}` } })

export const updateUserDetails = (data: {name: string; profileType: "INDIVIDUAL" | "COMPANY"; identificationNumber: string; taxPin: string; token: string}) => {
  const {token, ...body} = data;
  return API.put("/user/details", body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  })
}

/* Contacts */
export const verifyContact = (data: { contact: string; channel: "EMAIL" | "SMS", token: string }) => {
  return API.post('/user/verify/contact', { contact: data.contact, channel: data.channel },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.token}`
      }
    }
  );  
}

export const updateContact = (otp: string, token: string) => {
  return API.post('/user/update/contact', { otp },
    {
      headers: {
        "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
      }
    }
  );  
}

/* Register QRCODE */
export const registerQRCode = (token: string) => {
  return API.get('/otp/qrcode', {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  })
}

/* Lease Management APIs */
import { LeaseMode } from "@/types";

interface BaseLeaseTemplate {
  name: string;
  leaseMode: LeaseMode;
  petsPolicy?: string;
}

export interface SaleLeaseTemplate extends BaseLeaseTemplate {
  leaseMode: "SALE";
  selfRenew: boolean;
}

export interface RentLeaseTemplate extends BaseLeaseTemplate {
  leaseMode: "RENT";
  selfRenewable: boolean;
  leaseDurationInMonths: number;
  noticePeriodInMonths: number;
  depositReturnDays: number;
  rentDueDayOfMonth: number;
  entryNoticeDays: number;
  repairThreshold: number;
}

export type LeaseTemplatePayload = SaleLeaseTemplate | RentLeaseTemplate;

export const createLeaseTemplate = (
  payload: LeaseTemplatePayload,
  token: string
) => {
  return API.post("/lease/template", payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
};

export const updateLeaseTemplate = (
  id: string,
  payload: LeaseTemplatePayload,
  token: string
) => {
  return API.put(`/lease/template/${id}`, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
};


export const viewLeaseTemplate = (templateId: number, token: string) => {
  return API.get(`/lease/view/template?templateId=${templateId}`, {
    responseType: 'blob',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

export const viewLeaseTemplateUnit = (unitId: number, token: string) => {
  return API.get(`/lease/view/template?unitId=${unitId}`, {
    responseType: 'blob',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

export const viewLeaseTemplatePublic = (inviteToken: string) => {
  return API.get(`/lease/view/template?token=${inviteToken}`, {
    responseType: 'blob',
  });
}



export const listLeaseTemplates = (
  params: SearchParams = {
    sort: 'id,desc',
    page: 0,
    size: 10,
  },
  token: string
) => {
  const { sort, page, size } = params;
  const queryString = `?sort=${sort}&page=${page}&size=${size}`;
    return API.get(`/lease/template${queryString}`,
    {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
);
}

export const deleteLeaseTemplate = (templateId: number, token: string) => {
  return API.delete(`/lease/template/${templateId}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // Include the token in the request headers
    },
  });
}

export const listTenants = (
  unitId: number,
  params: SearchParams = {},
  token: string
) => {
  const { sort = 'id,desc', page = 0, size = 10 } = params;
  const queryString = `?sort=${sort}&page=${page}&size=${size}&unitId=${unitId}`;
    return API.get(`/property/unit/tenants${queryString}`,
    {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
);
}

export const listManagers = (
  unitId: number,
  token: string
) => {
 
  const queryString = `?unitId=${unitId}`;
    return API.get(`/property/unit/managers${queryString}`,  
    {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
);
}

export interface CreateLeaseTenantPayload {
  token: string;
  moveInDate: string;
  moveOutDate: string;
}

export const createLeaseTenant = (payload: CreateLeaseTenantPayload, jwt: string) => {
  return API.post("/lease/tenant/create", payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
  });
};

export const leaseMessage = (message: string, leaseId: number, token: string) => {
  return API.post(`/lease/message`, { message, leaseId }, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
};

export interface ListLeaseMessagesParams {
  sort?: string;
  page?: number;
  size?: number;
}

export const listLeaseMessages = (
  leaseId: number,
  params: ListLeaseMessagesParams = {},
  token: string
) => {
  const { sort = 'id,desc', page = 0, size = 10 } = params;
  const queryString = `?sort=${sort}&page=${page}&size=${size}&leaseId=${leaseId}`;
    return API.get(`/lease/message${queryString}`,
    {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
);
}

export const signLease = (leaseId: number, token: string) => {
  return API.post(`/lease/sign?leaseId=${leaseId}`, undefined, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

export interface TypeCatalogOption {
  id: string;
  name: string;
  description: string;
  category: string;
  displayOrder: number;
  common: boolean;
}

export interface PropertyUnitTypeCatalog {
  propertyType: TypeCatalogOption;
  enabledUnitTypeIds: string[];
}

export interface UnitTypeCatalog {
  propertyTypes: PropertyUnitTypeCatalog[];
  availableUnitTypes: TypeCatalogOption[];
}

export const getUnitTypeCatalog = () => API.get("/property/unit/type/catalog");
export const updateUnitTypeCatalog = (propertyType: string, unitTypeIds: string[]) =>
  API.put(`/property/unit/type/catalog/${encodeURIComponent(propertyType)}`, unitTypeIds);

export interface ActiveLease {
  id: number;
  name: string;
  leaseMode: "RENT" | "SALE";
  selfRenew: boolean;
  expiryDate?: string;
  signed: boolean;
  tenantName?: string;
  lifecycleStatus?: "DRAFT" | "ACTIVE" | "NOTICE_GIVEN" | "TERMINATED";
  terminationEffectiveDate?: string;
}

export const listActiveLeases = (page: number, size: number, token: string) =>
  API.get(`/lease/list?page=${page}&size=${size}&sort=id,desc`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const requestLeaseTermination = (
  leaseId: number,
  payload: { effectiveDate: string; reason: string },
  token: string,
) => API.post(`/lease/${leaseId}/termination`, payload, {
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
});


//Invoice APIs
export interface ListInvoicesParams {
  sort?: string;
  page?: number;
  size?: number;
  tenantId?: number;
  landlordId?: number;
  propertyId?: number;
  unitId?: number;
}
export const listLeases = (
  params: ListInvoicesParams = {},
  token: string
) => {
  const { sort = 'id,desc', page = 0, size = 10, tenantId, landlordId, propertyId, unitId } = params;
  const queryString = `?sort=${sort}&page=${page}&size=${size}&tenantId=${tenantId || ''}&landlordId=${landlordId || ''}&propertyId=${propertyId || ''}&unitId=${unitId || ''}`;
  return API.get(`/payment/invoice/list${queryString}`,
    {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
);
}

export const viewLeasePDF = (invoiceId: number, token: string) => {
  return API.get(`/payment/view/invoice?invoiceId=${invoiceId}`, {
    responseType: 'blob',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

export interface FilterParams {
  sort?: string; 
  page?: number;
  size?: number;
  search?: string;
  propertyId?: number;
}

export const searchTenants = (
  params: FilterParams = {},
  token: string
) => {
  const { sort = 'id,desc', page = 0, size = 10, search = '' } = params;
  const queryString = `?sort=${sort}&page=${page}&size=${size}&search=${search}`;
    return API.get(`/property/tenant/key/value${queryString}`,
    {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
);
}

export const searchLandlords = (
  params: FilterParams = {},
  token: string
) => {
  const { sort = 'id,desc', page = 0, size = 10, search = '' } = params;
  const queryString = `?sort=${sort}&page=${page}&size=${size}&search=${search}`;
    return API.get(`/property/landlord/key/value${queryString}`,
    {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
);
}


export const searchProperties = (
  params: FilterParams = {},
  token: string
) => {
  const { sort = 'id,desc', page = 0, size = 10, search = '' } = params;
  const queryString = `?sort=${sort}&page=${page}&size=${size}&search=${search}`;
    return API.get(`/property/list/key/value${queryString}`,
    {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
);
}

export const searchUnits = (
  params: FilterParams = {},
  token: string
) => {
  const { sort = 'id,desc', page = 0, size = 10, search = '', propertyId } = params;
  const queryString = `?sort=${sort}&page=${page}&size=${size}&propertyId=${propertyId}&search=${search}`;
    return API.get(`/property/unit/list/key/value${queryString}`,
    {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
);
}

//Payments

export const getSupportedPaymentChannels = (token: string) => {
  return API.get("/payment/channel/type", { 
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
     } });
}

// Confirmed contract: payment routes by the specific property-attached
// Account, but paymentChannel is still required alongside accountId (not
// replaced by it as first assumed) — the account's own `channel` field is
// the only source for this in the modal, so the two params always describe
// the same account.
export const initPayment = (invoiceRef: string, accountId: number, channel: string, token: string) => {
  return API.get(`/payment/init?invoiceRef=${invoiceRef}&accountId=${accountId}&paymentChannel=${channel}`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
}

export const listPayments = (
  params: SearchParamswithFilter= {},
  token: string
) => {
  const { sort = 'id,desc', page = 0, size = 10, filter=''} = params;
  const queryString = `?sort=${sort}&page=${page}&size=${size}&filter=${filter}`;
    return API.get(`/payment/list${queryString}`,
    {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
);
}

export const updateFWPayment = (status: string, ref: string, transactionId: string, token: string) => {
  return API.get(`/payment/fw/update?status=${status}&tx_ref=${ref}&transaction_id=${transactionId}`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  });
}

export const manualPaymentRecord = (invoiceRef: string, amount: number, token: string, channel: string = "", transId: string = "", transactionDate: string = "") => {
  return API.post(`/payment/record`, { invoiceRef: invoiceRef, amount: amount, channel: channel, transId: transId, transactionDate: transactionDate }, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  });
}

export const viewParams = (propertyId: number, token: string) => {
  return API.get(`/property/param/list?propertyId=${propertyId}`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export const addPropertyParam = (groupName: string, propertId: number, token: string) => {
  return API.post('/property/param/set', { groupName: groupName, propertyId: propertId }, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  });
}

export const deletePropertyParam = (groupName: string, propertyId: number, token: string) => {
  return API.delete(`/property/param/delete?groupName=${groupName}&propertyId=${propertyId}`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  });
}

//Accounts
export interface ListAccountsParams {
  // Confirmed backend contract: GET /account/list?byLandlord=true|false
  byLandlord?: boolean;
  // Confirmed via a real sample response (invoice pay-flow task): scopes the
  // list to accounts attached to a property. GET /account/list?propertyId=
  propertyId?: number;
  // Pagination — inferred from the convention every other paginated list
  // endpoint in this file uses (getUnits, getProperties, listPayments, …),
  // NOT separately confirmed for /account/list. Verify if results look off.
  page?: number;
  size?: number;
  sort?: string;
  // ⚠️ Page-2 (superadmin landlord-oversight) filters. Only these four names
  // are inferred from account-module.md's own phrasing — none are confirmed
  // against the backend. If filtering silently has no effect, this is why;
  // get the real param names/casing before relying on them.
  active?: boolean;
  verified?: boolean;
  landlordEmail?: string;
  channel?: string;
}

export const listAccounts = (token: string, params?: ListAccountsParams) => {
  return API.get(`/account/list`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    },
    params
  })
}

export const listAccountDetails = (accountId: number, token: string) => {
  return API.get(`/account/${accountId}`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export const activePaymentChannels = (token: string) => {
  return API.get(`/payment/channel/type`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
} 

export type paymentChannel = "MPESA" | "MPESA_BANK" | "PESA_LINK" | "PAYSTACK";

export type accountCategory = "LANDLORD" | "SLICKHOOD" | "MERCHANT" | "AFFILIATE" | "INSURANCE" | "COMMUNITY_FUND";

export const createLandlordAccount = (channel: paymentChannel, name: string, token: string) => {
return API.post(`/account/create`, { channel, name, category: "LANDLORD" }, {
  headers: {
    "Content-Type": 'application/json',
    Authorization: `Bearer ${token}`
  }
})
}

export const createSlickHoodAccount = (channel: paymentChannel, name: string, token: string) => {
  return API.post(`/account/create`, { channel, name, category: "SLICKHOOD" }, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export const createMerchantAccount = (channel: paymentChannel, name: string, token: string) => {
  return API.post(`/account/create`, { channel, name, category: "MERCHANT" }, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
  })
}

export const createUpdateAccount = (accountId: number, key: string, value: string, token: string) => {
  return API.put(`/account/${accountId}/property`, { key, value }, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}
export const decryptEncrypt = (accountId: number, key: string, token: string) => {
    return API.get(`/account/${accountId}/property/decrypt?key=${key}`, {
      headers: {
        "Content-Type": 'application/json',
        Authorization: `Bearer ${token}`
      }
    })
  }

// Confirmed contract: same path, split by HTTP method.
// GET  /account/{accountId}/verify — landlord/owner requests verification.
// PUT  /account/{accountId}/verify?verify=&comments= — superadmin decides.
//      comments is required by the backend when verify=false (rejecting).
export const requestAccountVerification = (accountId: number, token: string) => {
  return API.get(`/account/${accountId}/verify`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

// PUT with no body — the payload travels in query params per the backend
// contract. Axios URL-encodes `comments`, which matters since it contains
// spaces.
export const verifyAccount = (
  accountId: number,
  verify: boolean,
  token: string,
  comments?: string
) => {
  return API.put(`/account/${accountId}/verify`, null, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    },
    params: verify ? { verify } : { verify, comments }
  })
}

export const deleteAccount = (accountId: number, token: string) => {
  return API.delete(`/account/${accountId}`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

//property accounts
export const attachAccount = (accountId: number, propertyId: number, token: string) => {
  return API.post(`/property/account/add`, { accountId, propertyId }, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export const detachAccount = (accountId: number, propertyId: number, token: string) => {
  return API.delete(`/property/account/delete`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }, 
    data: { accountId, propertyId }
  })
} 

export const listPropertyAccounts = (propertyId: number, token: string) => {
  return API.get(`/account/list?propertyId=${propertyId}`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

// Dashboard
export const getDashboardTotals = (role: string, token: string) => {
  return API.get(`/dash/totals?role=${role}`, {
    headers: {
      "Content-Type": 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
}

export type MaintenanceWorkOrder = {
  id:number; workOrderNumber:string; propertyId:number; unitId:number; requestedByUserId:number;
  assignedProviderServiceId?:number; title:string; description:string; category:string; priority:string;
  status:string; scheduledAt?:string; completedAt?:string; estimatedCost?:number; actualCost?:number;
  currency?:string; resolutionNotes?:string; createdOn:string;
};

export const viewPaymentReceipt = (paymentId: number, token: string) => {
  return API.get(`/payment/view/receipt?paymentId=${paymentId}`, {
    responseType: 'blob',
    headers: { Authorization: `Bearer ${token}` },
  });
};
export const listUnitMaintenance = (unitId:number, token:string) => API.get(`/maintenance/unit/${unitId}`, {headers:{Authorization:`Bearer ${token}`}});
export const createMaintenance = (payload:{unitId:number;title:string;description:string;category:string;priority:string}, token:string) => API.post("/maintenance",payload,{headers:{Authorization:`Bearer ${token}`}});
export const updateMaintenance = (id:number,payload:{status:string;assignedProviderServiceId?:number;scheduledAt?:string;estimatedCost?:number;actualCost?:number;currency?:string;resolutionNotes?:string},token:string) => API.put(`/maintenance/${id}`,payload,{headers:{Authorization:`Bearer ${token}`}});

export type LeaseDocumentView = {id:number;leaseId?:number;propertyId:number;unitId?:number;documentType:string;status:string;name:string;templateVersion:number;effectiveDate?:string;responseDueDate?:string;issuedAt?:string;acknowledgedAt?:string;createdOn:string};
export const listLeaseDocuments = (token:string) => API.get("/lease/documents",{headers:{Authorization:`Bearer ${token}`}});
export const downloadLeaseDocumentPdf = (id:number,token:string) => API.get(`/lease/documents/${id}/pdf`,{responseType:"blob",headers:{Authorization:`Bearer ${token}`}});

/* local APIs */  
export const setCookie = (data: { token: string, refreshToken: string }) =>  fetch ("/browser-session/set-cookie", {
  method:"POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify(data)
});

export const clearCookie = () => fetch("/browser-session/clear-cookie", { method: "POST" });

export const setrefreshToken = () => fetch("/browser-session/refresh", {method: "POST"} )

export const retrieveRefreshToken = () => fetch("/browser-session/get-token", {method: "GET"} )
