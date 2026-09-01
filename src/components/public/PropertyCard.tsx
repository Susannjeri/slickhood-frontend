import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { absoluteApiUrl, formatMoney, type ListingCard } from "@/lib/property-listings";

export default function PropertyCard({ listing }: { listing: ListingCard }) {
  return <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
    <Link href={`/property/${listing.slug}`} className="block">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {/* The API serves only publication-authorized images and hides private storage references. */}
        <Image fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" src={absoluteApiUrl(listing.imageUrl)} alt={listing.headline} className="object-cover transition duration-500 group-hover:scale-105" />
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-[#141130]">{listing.listingType === "SALE" ? "For sale" : "For rent"}</span>
      </div>
      <div className="p-5">
        <h2 className="line-clamp-2 text-lg font-bold text-[#141130]">{listing.headline}</h2>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" />{listing.location}</p>
        <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4"><p className="text-xl font-extrabold text-[#EF4217]">{formatMoney(listing.currency, listing.price)}{listing.listingType === "RENT" && <span className="text-xs font-normal text-slate-500"> / month</span>}</p><p className="text-xs font-medium text-slate-500">{listing.unitType}</p></div>
      </div>
    </Link>
  </article>;
}
