import { API } from "@/lib/api";
import { GenerateLeaseDocumentRequest, LeaseDocumentTemplate } from "@/types/lease-document";

export const leaseDocumentService = {
  list: (params: { page?: number; size?: number; leaseId?: number; saleId?: number; propertyId?: number; unitId?: number } = {}) => API.get("/lease/documents", { params }),
  cancelDraft: (id: number) => API.post(`/lease/documents/${id}/cancel-draft`),
  generate: (data: GenerateLeaseDocumentRequest) => API.post("/lease/documents", data),
  issue: (id: number) => API.post(`/lease/documents/${id}/issue`),
  acknowledge: (id: number) => API.post(`/lease/documents/${id}/acknowledge`),
  reject: (id: number, reason: string) => API.post(`/lease/documents/${id}/reject`, { reason }),
  sign: (id: number) => API.post(`/lease/documents/${id}/sign`),
  templates: () => API.get("/lease/documents/templates"),
  editTemplate: (data: Pick<LeaseDocumentTemplate, "documentType" | "displayName" | "bodyHtml" | "legalReviewRequired">) =>
    API.post("/lease/documents/templates", data),
  pdf: (id: number) => API.get(`/lease/documents/${id}/pdf`, { responseType: "blob" }),
  branding: () => API.get("/lease/documents/branding"),
  uploadLogo: (logo: File) => { const data = new FormData(); data.append("logo", logo); return API.post("/lease/documents/branding", data); },
};
