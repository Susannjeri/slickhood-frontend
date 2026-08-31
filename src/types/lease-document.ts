export type LeaseDocumentType =
  | "RENTAL_LETTER_OF_OFFER" | "RESIDENTIAL_LEASE_AGREEMENT" | "COMMERCIAL_LEASE_AGREEMENT"
  | "LATE_RENT_NOTICE" | "RENT_DEFAULT_CURE_NOTICE"
  | "LANDLORD_TERMINATION_NOTICE" | "TENANT_TERMINATION_NOTICE"
  | "ESTATE_AGREEMENT" | "PROPERTY_SALE_AGREEMENT";

export type LeaseDocumentStatus =
  | "DRAFT" | "ISSUED" | "ACKNOWLEDGED" | "PARTIALLY_SIGNED"
  | "SIGNED" | "CANCELLED" | "EXPIRED";

export interface LeaseDocument {
  id: number;
  leaseId?: number;
  propertyId?: number;
  unitId?: number;
  documentType: LeaseDocumentType;
  status: LeaseDocumentStatus;
  name: string;
  templateVersion: number;
  issuerUserId: number;
  recipientUserId: number;
  effectiveDate?: string;
  responseDueDate?: string;
  amount?: number;
  currency?: string;
  reason?: string;
  deliveryChannel?: string;
  legalReviewRequired: boolean;
  issuedAt?: string;
  acknowledgedAt?: string;
  issuerSignedAt?: string;
  recipientSignedAt?: string;
}

export interface LeaseDocumentTemplate {
  id: number;
  documentType: LeaseDocumentType;
  displayName: string;
  version: number;
  bodyHtml: string;
  legalReviewRequired: boolean;
}

export interface GenerateLeaseDocumentRequest {
  leaseId?: number;
  propertyId?: number;
  recipientUserId?: number;
  documentType: LeaseDocumentType;
  effectiveDate?: string;
  responseDueDate?: string;
  amount?: number;
  currency?: string;
  reason?: string;
}
