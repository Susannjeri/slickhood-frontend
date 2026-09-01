import type { MetadataRoute } from "next";
import { getListings, siteBase, type ListingCard } from "@/lib/property-listings";

async function allPublishedListings(): Promise<ListingCard[]> {
  const first = await getListings(undefined, { size: "24", page: "0" }, true);
  const items = [...first.items];
  // Sitemap URLs are limited to 50,000 by the protocol. Fetch in bounded batches
  // so a growing catalogue does not create one unbounded fan-out to the API.
  const totalPages = Math.min(first.totalPages, Math.ceil(50_000 / 24));
  for (let page = 1; page < totalPages; page += 10) {
    const batch = await Promise.all(Array.from({ length: Math.min(10, totalPages - page) }, (_, offset) =>
      getListings(undefined, { size: "24", page: String(page + offset) }, true)));
    batch.forEach(result => items.push(...result.items));
  }
  return items.slice(0, 49_997);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBase();
  const listings = await allPublishedListings();
  const staticPages=["","/properties/rent","/properties/buy"].map((path,index)=>({url:`${base}${path}`,changeFrequency:(index?"daily":"weekly") as "daily"|"weekly",priority:index?0.8:1}));
  const listingPages=listings.map(item=>({url:`${base}/property/${item.slug}`,lastModified:item.publishedAt,changeFrequency:"daily" as const,priority:0.7}));
  return [...staticPages,...listingPages];
}
