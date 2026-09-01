import type { MetadataRoute } from "next";
import { getListings } from "@/lib/property-listings";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [rent,sale]=await Promise.all([getListings("RENT",{size:"24"}),getListings("SALE",{size:"24"})]);
  const staticPages=["","/properties/rent","/properties/buy"].map((path,index)=>({url:`https://slickhood.com${path}`,changeFrequency:(index?"daily":"weekly") as "daily"|"weekly",priority:index?0.8:1}));
  const listingPages=[...rent.items,...sale.items].map(item=>({url:`https://slickhood.com/property/${item.slug}`,lastModified:item.publishedAt,changeFrequency:"daily" as const,priority:0.7}));
  return [...staticPages,...listingPages];
}
