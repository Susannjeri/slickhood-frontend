import { API } from "@/lib/api";

export type PrivacyRequestType = "ACCESS_EXPORT" | "ERASURE";
export type PrivacyRequestStatus = "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "IN_PROGRESS" | "REJECTED" | "COMPLETED";

export interface PrivacyRequestView {
  id: number;
  type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  reason: string;
  submittedAt: string;
  dueAt: string;
  legalHold: boolean;
  retentionBasis?: string;
  reviewerNotes?: string;
  resultReference?: string;
  reviewedAt?: string;
}

export interface PrivacyReview {
  status: PrivacyRequestStatus;
  legalHold: boolean;
  retentionBasis?: string;
  reviewerNotes: string;
  resultReference?: string;
}

export const submitPrivacyRequest = (type: PrivacyRequestType, reason: string) =>
  API.post("/privacy/requests", { type, reason });

export const listMyPrivacyRequests = () => API.get("/privacy/requests/my?size=100");

export const downloadMyPrivacyData = () => API.get("/privacy/export", { responseType: "blob" });

export const listPrivacyRequestsForReview = () => API.get("/privacy/admin/requests?size=100");

export const reviewPrivacyRequest = (id: number, review: PrivacyReview) =>
  API.put(`/privacy/admin/requests/${id}`, review);
