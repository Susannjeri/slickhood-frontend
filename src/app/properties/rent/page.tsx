import type { Metadata } from "next";
import PropertyCatalogue from "../PropertyCatalogue";
export const metadata: Metadata = { title: "Homes to rent", description: "Browse available homes to rent on Slickhood and contact the responsible property team.", alternates: { canonical: "/properties/rent" } };
export default function RentPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) { return <PropertyCatalogue type="RENT" searchParams={searchParams}/>; }
