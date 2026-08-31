import { API } from "@/lib/api";

export type KycStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "REVIEW_REQUIRED"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED";
export type AccountStatus =
  | "PENDING_EMAIL_VERIFICATION"
  | "PENDING_KYC"
  | "KYC_UNDER_REVIEW"
  | "KYC_REJECTED"
  | "ACTIVE"
  | "SUSPENDED";

export interface KycRequirement {
  code: string;
  label: string;
  required: boolean;
  acceptedTypes: string[];
}

export interface KycDocument {
  id: number;
  documentType: string;
  originalFileName?: string;
  contentType?: string;
  status: string;
  qualityStatus: string;
  qualityScore?: number;
  ocrConfidence?: number;
  extractedFields: Record<string, string>;
  validationIssues?: KycValidationIssue[];
  rejectionReason?: string;
  uploadedAt: string;
  downloadUrl?: string;
}

export interface KycValidationIssue {
  field: string;
  code: string;
  message: string;
  guidance: string;
  blocking: boolean;
}

export interface KycCase {
  id: number | null;
  status: KycStatus;
  accountStatus: AccountStatus;
  consentVersion: string;
  reviewNotes?: string;
  phoneVerified: boolean;
  verifiedPhoneNumber?: string;
  phoneVerifiedAt?: string;
  registryStatus: string;
  ocrEnabled: boolean;
  requirements: KycRequirement[];
  missingRequirementCodes: string[];
  documents: KycDocument[];
}

export interface KycAdminCase {
  userId: number;
  fullName: string;
  email: string;
  kycCase: KycCase;
}

export interface KycDocumentReviewDecision {
  documentId: number;
  approved: boolean;
  reason?: string;
}

const first = <T>(response: { data: { data?: T[] } }) =>
  response.data.data?.[0];

export async function getCurrentKyc() {
  const response = await API.get("/kyc/current");
  return first<KycCase>(response)!;
}

export async function startKyc(consentVersion: string) {
  const response = await API.post("/kyc/start", {
    consent: true,
    consentVersion,
  });
  return first<KycCase>(response)!;
}

export async function uploadKycDocument(documentType: string, file: File) {
  const body = new FormData();
  body.append("documentType", documentType);
  body.append("file", file);
  const response = await API.post("/kyc/documents", body);
  return first<KycDocument>(response)!;
}

export async function fetchKycDocumentContent(documentId: number) {
  const response = await API.get(`/kyc/documents/${documentId}/content`, {
    responseType: "blob",
  });
  return response.data as Blob;
}

export async function submitKyc() {
  const response = await API.post("/kyc/submit");
  return first<KycCase>(response)!;
}

export async function reprocessKycDocuments() {
  const response = await API.post("/kyc/reprocess");
  return first<KycCase>(response)!;
}

export async function listKycReviewQueue() {
  const response = await API.get("/kyc/admin/queue");
  return (response.data.data ?? []) as KycAdminCase[];
}

export async function reprocessKycCase(caseId: number) {
  const response = await API.post(`/kyc/admin/${caseId}/reprocess`);
  return first<KycCase>(response)!;
}

export async function reviewKyc(
  caseId: number,
  decision: "APPROVED" | "REJECTED",
  notes: string,
  documents: KycDocumentReviewDecision[] = [],
) {
  const response = await API.post(`/kyc/admin/${caseId}/review`, {
    decision,
    notes,
    documents,
  });
  return first<KycCase>(response)!;
}
