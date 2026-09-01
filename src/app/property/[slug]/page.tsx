import type { Metadata } from "next";
/* eslint-disable @next/next/no-img-element -- listing images use the access-controlled API proxy and cannot use a static Next image host allowlist */
import { notFound } from "next/navigation";
import { BadgeCheck, Building2, MapPin, Ruler, ShieldCheck } from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import InquiryForm from "@/components/public/InquiryForm";
import { absoluteApiUrl, formatMoney, getListing, siteBase } from "@/lib/property-listings";

type Props = { params: Promise<{ slug: string }> };
const safeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getListing((await params).slug);
  if (!listing) return { title: "Property not found", robots: { index: false } };
  const description = `${listing.unitType} ${listing.listingType === "SALE" ? "for sale" : "to rent"} in ${listing.location}. ${formatMoney(listing.currency, listing.price)}.`;
  return {
    title: listing.headline,
    description,
    alternates: { canonical: `/property/${listing.slug}` },
    openGraph: {
      title: listing.headline,
      description,
      type: "website",
      images: listing.imageUrls.slice(0, 1).map(url => absoluteApiUrl(url)),
    },
  };
}

export default async function PropertyPage({ params }: Props) {
  const listing = await getListing((await params).slug);
  if (!listing) notFound();
  const trustLabel = listing.verified ? "Identity-verified publisher" : "Published through Slickhood";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: listing.headline,
    description: listing.description,
    url: `${siteBase()}/property/${listing.slug}`,
    image: listing.imageUrls.map(absoluteApiUrl),
    datePosted: listing.publishedAt,
    offers: {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: listing.currency,
      availability: "https://schema.org/InStock",
    },
    address: { "@type": "PostalAddress", addressLocality: listing.location },
  };

  return <div className="min-h-screen bg-[#fbfaf8] text-[#141130]">
    <PublicHeader />
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {listing.imageUrls.length
          ? <div className="aspect-[16/10] overflow-hidden rounded-3xl bg-slate-100"><img src={absoluteApiUrl(listing.imageUrls[0])} alt={listing.headline} className="h-full w-full object-cover" /></div>
          : <div className="grid aspect-[16/10] place-items-center rounded-3xl bg-slate-100"><Building2 className="h-14 w-14 text-slate-300" /></div>}
        <aside className="rounded-3xl bg-[#141130] p-7 text-white">
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">{listing.listingType === "SALE" ? "For sale" : "For rent"}</span>
          <p className="mt-7 text-3xl font-black text-[#ff7951]">{formatMoney(listing.currency, listing.price)}{listing.listingType === "RENT" && <span className="text-sm font-normal text-white/60"> / month</span>}</p>
          <p className="mt-5 flex items-center gap-2 text-sm text-white/70"><MapPin className="h-4 w-4" />{listing.location}</p>
          <div className="mt-7 border-t border-white/15 pt-6">
            <p className="flex items-center gap-2 text-sm"><ShieldCheck className="h-5 w-5 text-[#ff7951]" />{trustLabel}</p>
            <p className="mt-2 text-xs leading-5 text-white/50">Availability and contact are controlled through the active property record. Confirm details before paying or signing.</p>
          </div>
        </aside>
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_.6fr]">
        <article>
          <p className="flex items-center gap-2 text-sm font-bold text-[#EF4217]"><BadgeCheck className="h-4 w-4" />{trustLabel}</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">{listing.headline}</h1>
          <div className="mt-7 grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
            <div><p className="text-xs text-slate-500">Property</p><p className="mt-1 font-bold">{listing.propertyType.replaceAll("_", " ")}</p></div>
            <div><p className="text-xs text-slate-500">Unit</p><p className="mt-1 font-bold">{listing.unitType}</p></div>
            <div><p className="text-xs text-slate-500">Size</p><p className="mt-1 flex items-center gap-1 font-bold"><Ruler className="h-4 w-4" />{listing.size || "Ask agent"}</p></div>
          </div>
          <h2 className="mt-9 text-xl font-black">About this property</h2>
          <p className="mt-3 leading-7 text-slate-600">{listing.description}</p>
          {listing.amenities.length > 0 && <>
            <h2 className="mt-9 text-xl font-black">Features</h2>
            <ul className="mt-4 grid grid-cols-2 gap-3">{listing.amenities.map(item => <li key={item} className="rounded-xl bg-white px-4 py-3 text-sm">{item}</li>)}</ul>
          </>}
        </article>
        <aside>
          <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-xl font-black">Interested in this property?</h2>
            <p className="mt-2 text-sm text-slate-500">Send a viewing request to the owner or appointed agent.</p>
            <div className="mt-6"><InquiryForm slug={listing.slug} /></div>
          </div>
        </aside>
      </div>
    </main>
    <PublicFooter />
  </div>;
}
