import type { Metadata } from "next";
import PropertyCatalogue from "../PropertyCatalogue";
export const metadata: Metadata = { title: "Property for sale", description: "Browse available property for sale on Slickhood and contact the responsible property team.", alternates: { canonical: "/properties/buy" } };
export default function BuyPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) { return <PropertyCatalogue type="SALE" searchParams={searchParams}/>; }
