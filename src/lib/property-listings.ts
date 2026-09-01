export type ListingCard = {
  slug: string; listingType: "RENT" | "SALE"; headline: string; propertyType: string;
  unitType: string; size: number; price: number; currency: string; location: string;
  imageUrl: string; publishedAt: string;
};

export type ListingDetail = ListingCard & {
  description: string; propertyName: string; amenities: string[]; imageUrls: string[];
  expiresAt: string; verified: boolean;
};

export type ListingPage = { items: ListingCard[]; page: number; size: number; totalPages: number; totalElements: number };
export type ListingFilters = { unitTypes: { value: string; label: string }[] };

export const apiBase = () => (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
export const siteBase = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://slickhood.com").replace(/\/$/, "");
export const absoluteApiUrl = (path: string) => path.startsWith("http") ? path : `${apiBase()}${path.startsWith("/") ? "" : "/"}${path}`;
const publicApiFetchOptions = (cacheable: boolean) => cacheable
  ? { next: { revalidate: 120 }, signal: AbortSignal.timeout(5_000) }
  : { cache: "no-store" as const, signal: AbortSignal.timeout(5_000) };

export async function getListings(type?: "RENT" | "SALE", query: Record<string, string | undefined> = {}, cacheable = false): Promise<ListingPage> {
  const params = new URLSearchParams({ size: "12", ...(type ? { type } : {}) });
  Object.entries(query).forEach(([key, value]) => { if (value) params.set(key, value); });
  try {
    const response = await fetch(`${apiBase()}/public/property-listings?${params}`, publicApiFetchOptions(cacheable));
    if (!response.ok) return { items: [], page: 0, size: 12, totalPages: 0, totalElements: 0 };
    return response.json();
  } catch { return { items: [], page: 0, size: 12, totalPages: 0, totalElements: 0 }; }
}

export async function getListing(slug: string): Promise<ListingDetail | null> {
  try {
    const response = await fetch(`${apiBase()}/public/property-listings/${encodeURIComponent(slug)}`, publicApiFetchOptions(true));
    return response.ok ? response.json() : null;
  } catch { return null; }
}

export async function getListingFilters(type: "RENT" | "SALE"): Promise<ListingFilters> {
  try {
    const response = await fetch(`${apiBase()}/public/property-listings/filters?type=${type}`, publicApiFetchOptions(true));
    return response.ok ? response.json() : { unitTypes: [] };
  } catch { return { unitTypes: [] }; }
}

export const formatMoney = (currency: string, amount: number) => new Intl.NumberFormat("en-KE", {
  style: "currency", currency: currency || "KES", maximumFractionDigits: 0,
}).format(amount);
