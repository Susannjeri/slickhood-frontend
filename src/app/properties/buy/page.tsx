import type { Metadata } from "next";
import PropertyCatalogue from "../PropertyCatalogue";
export const metadata: Metadata = { title: "Property for sale | Slickhood", description: "Browse active property for sale, published from managed Slickhood property records.", alternates: { canonical: "/properties/buy" } };
export default function BuyPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) { return <PropertyCatalogue type="SALE" searchParams={searchParams}/>; }
