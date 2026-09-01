import type { Metadata } from "next";
import PropertyCatalogue from "../PropertyCatalogue";
export const metadata: Metadata = { title: "Homes to rent | Slickhood", description: "Browse verified homes and property to rent on Slickhood." };
export default function RentPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) { return <PropertyCatalogue type="RENT" searchParams={searchParams}/>; }
