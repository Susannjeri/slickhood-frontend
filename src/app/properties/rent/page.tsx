import type { Metadata } from "next";
import PropertyCatalogue from "../PropertyCatalogue";
export const metadata: Metadata = { title: "Homes to rent | Slickhood", description: "Browse active homes and property to rent, published from managed Slickhood property records." };
export default function RentPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) { return <PropertyCatalogue type="RENT" searchParams={searchParams}/>; }
