export function deliveryLabel(item: { delivered: boolean; channel: string }): string {
  if (!item.delivered) return "Delivery not confirmed";
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
