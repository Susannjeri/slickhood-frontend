export function deliveryLabel(item: { delivered: boolean; channel: string }): string {
  if (!item.delivered) return "Delivery not confirmed";
  if (item.channel === "IN_APP") return "Available in SlickHood";
  return item.channel === "EMAIL" ? "Accepted by mail server" : "Delivered";
}

const FRIENDLY_NOTIFICATION_TITLES: Record<string, string> = {
  RENTAL_PAYMENT_OVERDUE: "Rent payment overdue",
  RENT_PAYMENT_OVERDUE: "Rent payment overdue",
  RENT_RECEIVABLE_OVERDUE: "Rent receivable overdue",
  RENTAL_RECEIVABLE_OVERDUE: "Rent receivable overdue",
  SALE_PAYMENT_OVERDUE: "Property payment overdue",
  SALE_RECEIVABLE_OVERDUE: "Property-sale receivable overdue",
  SERVICE_CHARGE_DUE_SOON: "Estate charge due soon",
  SERVICE_CHARGE_OVERDUE: "Estate charge overdue",
  SERVICE_CHARGE_RECEIVABLE_OVERDUE: "Estate charge receivable overdue",
  LATE_FEE_ASSESSED: "Late-payment fee added",
  LATE_FEE_ASSESSED_EMAIL: "Late-payment fee added",
  LATE_FEE_BILLER: "Late-payment fee charged",
  LEASE_TERMINATION_NOTICE: "Lease termination notice",
  LEASE_TERMINATED: "Lease ended",
  LEASE_RENEWED: "Lease renewed",
  OWNERSHIP_RECORD_ENDED: "Homeownership record ended",
  PAYMENT_RECEIVED: "Payment received",
  PARTIAL_PAYMENT_RECEIVED: "Partial payment received",
  INVITE_RECEIVED: "New invitation",
  SOKO_ORDER_STATUS: "Order update",
  SOKO_RIDER_STATUS: "Rider status updated",
  SOKO_RIDER_VERIFICATION: "Rider verification update",
  SOKO_RIDER_REVIEW_REQUIRED: "Rider review required",
};

/** Converts internal event codes into short, customer-facing alert titles. */
export function notificationTitle(type: string): string {
  const normalized = type.trim().toUpperCase();
  const mapped = FRIENDLY_NOTIFICATION_TITLES[normalized];
  if (mapped) return mapped;
  return normalized
    .replace(/_EMAIL$/, "")
    .split("_")
    .filter(Boolean)
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function notificationActionLabel(type: string): string {
  const normalized = type.toUpperCase();
  if (normalized.includes("PROPERTY_LISTING_INQUIRY")) return "View property";
  if (normalized.includes("INVITE")) return "Review invitation";
  if (normalized.includes("INVOICE") || normalized.includes("PAYMENT") || normalized.includes("FEE") || normalized.includes("CHARGE")) return "Review billing";
  if (normalized.includes("LEASE") || normalized.includes("TERMINAT")) return "Review notice";
  if (normalized.includes("SALE")) return "Review property sale";
  if (normalized.includes("OWNERSHIP") || normalized.includes("ESTATE")) return "Review estate details";
  return "Review details";
}

// Return text only, never executable HTML. Email markup should not clutter the in-app feed.
export function notificationText(message: string): string {
  return message.replace(/<\s*br\s*\/?\s*>|<\/\s*(p|div|li)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g, entity => ({
      "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'", "&nbsp;": " ",
    }[entity] ?? entity)).trim();
}

// Notification messages are stored as text, never executable markup. Only return
// an HTTPS URL on the current SlickHood application origin, or a known internal
// application path. This keeps lifecycle calls-to-action useful without turning
// stored messages into an open redirect/phishing link.
export function notificationActionUrl(message: string, applicationOrigin: string): string | undefined {
  const text = notificationText(message);
  const linkedCandidate = message.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
  const candidate = (linkedCandidate ?? text.match(/https?:\/\/[^\s<>"']+|\/(?:dashboard|lease)(?:\/|\?)[^\s<>"']*/i)?.[0])?.replace(/[),.;]+$/, "");
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate, applicationOrigin);
    const allowedOrigin = new URL(applicationOrigin).origin;
    const publicPropertyOrigin = "https://slickhood.com";
    const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
    if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) return undefined;
    const internalAction = url.origin === allowedOrigin
      && (url.pathname === "/dashboard" || /^\/dashboard\/[A-Za-z0-9_/-]+$/.test(url.pathname) || url.pathname === "/lease/onboard");
    const publicPropertyAction = url.origin === publicPropertyOrigin
      && /^\/property\/[A-Za-z0-9-]+$/.test(url.pathname);
    if (!internalAction && !publicPropertyAction) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}
