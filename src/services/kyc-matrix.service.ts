import { API } from "@/lib/api";

export type KycMatrixRequirement = {
  id: number;
  scopeType: "COMMON" | "PROVIDER_TYPE" | "SERVICE_CATEGORY" | "SOKO_CATEGORY";
  scopeKey: string;
  scopeLabel: string;
  requirementCode: string;
  requirementLabel: string;
  obligation: "MANDATORY" | "OPTIONAL" | "CONDITIONAL";
  profileScope: "INDIVIDUAL" | "COMPANY" | "BOTH";
  acceptedDocumentTypes: string;
  conditionDescription?: string;
  conditionRule?: "NON_PASSPORT_IDENTITY" | "PROFILE_IS" | "VERIFIED_DOCUMENT_PRESENT" | "VERIFIED_DOCUMENT_MISSING";
  conditionValue?: string;
  validityDays?: number;
  renewalLeadDays?: number;
  active: boolean;
};
export type KycMatrixRelease = { id:number; versionNo:number; status:string; changeSummary?:string; publishedAt?:string; publishedBy?:number };
export type KycMatrixView = { release:KycMatrixRelease; requirements:KycMatrixRequirement[] };
export type KycMatrixPreview = { published:KycMatrixView; draft:KycMatrixView; added:number; changed:number; deactivated:number };
export type KycMatrixPayload = Omit<KycMatrixRequirement,"id">;

const one = <T>(response:{data?:{data?:T[]}}) => response.data?.data?.[0] as T;
export const getKycMatrixDraft = async()=>one<KycMatrixView>(await API.get("/kyc/admin/matrix/draft"));
export const getKycMatrixPreview = async()=>one<KycMatrixPreview>(await API.get("/kyc/admin/matrix/preview"));
export const getKycMatrixHistory = async()=>((await API.get("/kyc/admin/matrix/history")).data?.data??[]) as KycMatrixRelease[];
export const addKycMatrixRequirement = (payload:KycMatrixPayload)=>API.post("/kyc/admin/matrix/requirements",payload);
export const updateKycMatrixRequirement = (id:number,payload:KycMatrixPayload)=>API.put(`/kyc/admin/matrix/requirements/${id}`,payload);
export const deactivateKycMatrixRequirement = (id:number)=>API.delete(`/kyc/admin/matrix/requirements/${id}`);
export const publishKycMatrix = (changeSummary:string)=>API.post("/kyc/admin/matrix/publish",{changeSummary});
