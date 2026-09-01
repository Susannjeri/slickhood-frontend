import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots { return { rules:{userAgent:"*",allow:["/","/properties/","/property/"],disallow:["/dashboard/","/api/","/browser-session/"]}, sitemap:"https://slickhood.com/sitemap.xml", host:"https://slickhood.com" }; }
