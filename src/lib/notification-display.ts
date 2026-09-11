export function deliveryLabel(item: { delivered: boolean; channel: string }): string {
  if (!item.delivered) return "Delivery not confirmed";
  if (item.channel === "IN_APP") return "Available in SlickHood";
  return item.channel === "EMAIL" ? "Accepted by mail server" : "Delivered";
}

// Return text only, never executable HTML. Email markup should not clutter the in-app feed.
export function notificationText(message: string): string {
  return message.replace(/<\s*br\s*\/?\s*>|<\/\s*(p|div|li)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g, entity => ({
      "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'", "&nbsp;": " ",
    }[entity] ?? entity)).trim();
}

// Invitation messages are stored as text, never executable markup. Only return an
// HTTPS URL on the current SlickHood application origin, preventing a compromised
// or malformed notification from becoming an open redirect/phishing link.
export function notificationActionUrl(message: string, applicationOrigin: string): string | undefined {
  const text = notificationText(message);
  const candidate = text.match(/https?:\/\/[^\s<>"']+/i)?.[0]?.replace(/[),.;]+$/, "");
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate);
    const allowedOrigin = new URL(applicationOrigin).origin;
    const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
    if ((url.protocol !== "https:" && !(loopback && url.protocol === "http:"))
        || url.origin !== allowedOrigin) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}
