// ─── API raw shapes ───────────────────────────────────────────────────────────

export interface InvoiceListItem {
  id: number;
  createdOn: string;
  propertyDetails: string;
  propertyId: number | null;
  propertyName?: string;
  unitRef?: string;
  tenantName: string;
  ref: string;
  currency: string;
  amount: number;
  pendingAmount?: number;
  paid: boolean;
  paymentAccountId?: number;
  billingType?: string;
  dueDate?: string | null;
  issuerName?: string;
  issuerType?: string;
  issuerLogoUrl?: string | null;
}

export interface InvoiceListResponse {
  success: boolean;
  data: InvoiceListItem[];
  totalPages: number;
  totalElements: number;
  size: number;
}

// ─── Shared option shape — used by all four comboboxes ───────────────────────
// Every search endpoint (properties, units, tenants, landlords)
// returns the same { id, name } shape. One type covers all four.

export interface SearchOption {
  id: number;
  name: string;
}

// ─── UI shape ─────────────────────────────────────────────────────────────────

export type InvoiceStatus = "PAID" | "PARTIALLY PAID" | "OVERDUE" | "UNPAID";

export interface Invoice {
  id: number;
  ref: string;
  currency: string;
  status: InvoiceStatus;
  propertyId: number | null;
  propertyName: string;
  unit: string;
  tenantName: string;
  date: string;
  amount: number;
  pendingAmount: number;
  paymentAccountId?: number;
  billingType: string;
  dueDate?: string | null;
  issuerName: string;
  issuerType: string;
  issuerLogoUrl?: string | null;
}

// ─── Active filters — what gets sent to the API ───────────────────────────────

export interface InvoiceFilters {
  propertyId?: number;
  unitId?: number;
  tenantId?: number;
  landlordId?: number;
}

// ─── Transformer ──────────────────────────────────────────────────────────────

const parsePropertyDetails = (details: string) => {
  const match = details.match(/Property:\s*(.+?)\s*-\s*Unit:\s*(.+)/);
  return {
    propertyName: match?.[1]?.trim() ?? details,
    unit: match?.[2]?.trim() ?? "",
  };
};

const formatDate = (isoString: string): string =>
  new Date(isoString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const transformInvoice = (item: InvoiceListItem): Invoice => {
  const parsed = parsePropertyDetails(item.propertyDetails);
  const propertyName = item.propertyName ?? parsed.propertyName;
  const unit = item.unitRef ?? parsed.unit;
  const pendingAmount = item.pendingAmount ?? (item.paid ? 0 : item.amount);
  const isOverdue = !item.paid && !!item.dueDate && new Date(item.dueDate).getTime() < Date.now();
  const status: InvoiceStatus = item.paid
    ? "PAID"
    : pendingAmount > 0 && pendingAmount < item.amount
      ? "PARTIALLY PAID"
      : isOverdue ? "OVERDUE" : "UNPAID";
  return {
    id: item.id,
    ref: item.ref,
    currency:item.currency, // default to BND if currency is missing
    status,
    propertyId: item.propertyId,
    propertyName,
    unit,
    tenantName: item.tenantName,
    date: formatDate(item.createdOn),
    amount: item.amount,
    pendingAmount,
    paymentAccountId: item.paymentAccountId,
    billingType: item.billingType ?? "RENTAL",
    dueDate: item.dueDate,
    issuerName: item.issuerName ?? propertyName,
    issuerType: item.issuerType ?? "LANDLORD",
    issuerLogoUrl: item.issuerLogoUrl,
  };
};


export interface PaymentChannel {
  id: string;       // e.g. "MPESA" | "PESA_LINK" | "PAYSTACK"
  name: string;     // e.g. "M-Pesa" | "PesaLink" | "Paystack"
  description: string;
  iconUrl: string;
}

export interface PaymentItem {
  id: number;
  createdOn: string;
  amount: number;
  channel: string;
  category: string;
  customerName: string | null;
  transId: string | null;
  status: string;
  description: string | null;
  inProgress: boolean;
  success: boolean;
}

export interface PaymentListResponse {
  success: boolean;
  code: string;
  description: string;
  data: PaymentItem[];
  totalPages: number;
  totalElements: number;
  size: number;
}

// UI shape — only what we display
export interface Payment {
  id: number;
  amount: number;
  channel: string;
  transId: string | null;
  createdOn: string; // formatted
  success: boolean;
  inProgress: boolean;
  description: string | null;
}

// Transformer
export const transformPayment = (item: PaymentItem): Payment => ({
  id: item.id,
  amount: item.amount,
  channel: item.channel,
  transId: item.transId,
  success: item.success,
  inProgress: item.inProgress,
  description: item.description,
  createdOn: new Date(item.createdOn).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }),
});
