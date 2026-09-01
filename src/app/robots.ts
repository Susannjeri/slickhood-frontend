import type { MetadataRoute } from "next";
import { siteBase } from "@/lib/property-listings";
export default function robots(): MetadataRoute.Robots { const base=siteBase(); return { rules:{userAgent:"*",allow:["/","/properties/","/property/"],disallow:["/dashboard/","/api/","/browser-session/"]}, sitemap:`${base}/sitemap.xml`, host:base }; }
