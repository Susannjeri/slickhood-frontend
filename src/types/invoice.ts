// ─── API raw shapes ───────────────────────────────────────────────────────────

export interface InvoiceListItem {
  id: number;
  createdOn: string;
  propertyDetails: string;
  propertyId: number;
  tenantName: string;
  ref: string;
  currency: string;
  amount: number;
  paid: boolean;
  paymentAccountId?: number;
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

export type InvoiceStatus = "PAID" | "UNPAID";

export interface Invoice {
  id: number;
  ref: string;
  currency: string;
  status: InvoiceStatus;
  propertyId: number;
  propertyName: string;
  unit: string;
  tenantName: string;
  date: string;
  amount: number;
  paymentAccountId?: number;
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
  const { propertyName, unit } = parsePropertyDetails(item.propertyDetails);
  return {
    id: item.id,
    ref: item.ref,
    currency:item.currency, // default to BND if currency is missing
    status: item.paid ? "PAID" : "UNPAID",
    propertyId: item.propertyId,
    propertyName,
    unit,
    tenantName: item.tenantName,
    date: formatDate(item.createdOn),
    amount: item.amount,
    paymentAccountId: item.paymentAccountId,
  };
};


export interface PaymentChannel {
  id: string;       // e.g. "MPESA" | "FLUTTER_WAVE" | "PAYSTACK"
  name: string;     // e.g. "M-Pesa" | "Card Payment" | "Paystack"
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
export interface PaymentChannel {
  id: string;       // e.g. "MPESA" | "FLUTTER_WAVE" | "PAYSTACK"
  name: string;     // e.g. "M-Pesa" | "Card Payment" | "Paystack"
  description: string;
  iconUrl: string;
}
