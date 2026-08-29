import { API } from "@/lib/api";
import { GenerateLeaseDocumentRequest, LeaseDocumentTemplate } from "@/types/lease-document";

export const leaseDocumentService = {
  list: () => API.get("/lease/documents"),
  generate: (data: GenerateLeaseDocumentRequest) => API.post("/lease/documents", data),
  issue: (id: number) => API.post(`/lease/documents/${id}/issue`),
  acknowledge: (id: number) => API.post(`/lease/documents/${id}/acknowledge`),
  sign: (id: number) => API.post(`/lease/documents/${id}/sign`),
  templates: () => API.get("/lease/documents/templates"),
  editTemplate: (data: Pick<LeaseDocumentTemplate, "documentType" | "displayName" | "bodyHtml" | "legalReviewRequired">) =>
    API.post("/lease/documents/templates", data),
  pdf: (id: number) => API.get(`/lease/documents/${id}/pdf`, { responseType: "blob" }),
};
