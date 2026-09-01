import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, KeyRound, ShieldCheck } from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PropertyCard from "@/components/public/PropertyCard";
import { getListings } from "@/lib/property-listings";

export default async function HomePage() {
  const featured = await getListings("RENT", { size: "6" }, true);
  const benefits = [
    [KeyRound, "Rent with clarity", "See the price, location and key details before requesting a viewing."],
    [BadgeCheck, "Trusted listings", "Only active, publication-ready properties appear in the catalogue."],
    [Building2, "Built for owners too", "Publish from the same record used to manage your property—no duplicate entry."],
  ] as const;
  return <div className="min-h-screen bg-[#fbfaf8] text-[#141130]">
    <PublicHeader />
    <main>
      <section className="relative overflow-hidden bg-[#141130] text-white">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_75%_25%,#EF4217,transparent_36%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-24 lg:grid-cols-[1.2fr_.8fr] lg:px-8 lg:py-32">
          <div><span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">Property decisions, made simpler</span><h1 className="mt-7 max-w-3xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">Find a place that fits your next chapter.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">Explore active rental and sale listings published directly by owners and their appointed property teams.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/properties/rent" className="rounded-full bg-[#EF4217] px-6 py-3.5 font-bold hover:bg-[#d93612]">Find a home to rent</Link><Link href="/properties/buy" className="rounded-full border border-white/25 px-6 py-3.5 font-bold hover:bg-white/10">Explore properties for sale</Link></div></div>
          <div className="grid content-center gap-4 sm:grid-cols-2 lg:grid-cols-1"><div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur"><BadgeCheck className="h-7 w-7 text-[#ff8d68]" /><p className="mt-4 text-xl font-bold">Controlled publication</p><p className="mt-2 text-sm leading-6 text-white/65">Listings come from active Slickhood property records and stop displaying when unavailable.</p></div><div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur"><ShieldCheck className="h-7 w-7 text-[#ff8d68]" /><p className="mt-4 text-xl font-bold">Private by design</p><p className="mt-2 text-sm leading-6 text-white/65">Your enquiry goes only to the responsible owner or appointed agent.</p></div></div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="flex items-end justify-between gap-5"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-[#EF4217]">Fresh listings</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Homes ready to discover</h2></div><Link href="/properties/rent" className="hidden items-center gap-2 font-bold text-[#EF4217] sm:flex">View all <ArrowRight className="h-4 w-4" /></Link></div>{featured.items.length ? <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{featured.items.slice(0,6).map(item => <PropertyCard key={item.slug} listing={item} />)}</div> : <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><Building2 className="mx-auto h-9 w-9 text-slate-400" /><p className="mt-4 font-bold">New homes are being prepared.</p><p className="mt-2 text-sm text-slate-500">Check again soon or list your property today.</p></div>}</section>
      <section className="bg-white"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-20 md:grid-cols-3 lg:px-8">{benefits.map(([Icon,title,text]) => <div key={title} className="rounded-3xl bg-[#fbfaf8] p-7"><Icon className="h-7 w-7 text-[#EF4217]"/><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></div>)}</div></section>
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="flex flex-col items-start justify-between gap-7 rounded-[2rem] bg-[#EF4217] p-8 text-white sm:p-12 lg:flex-row lg:items-center"><div><h2 className="text-3xl font-black">Have a property to rent or sell?</h2><p className="mt-3 max-w-2xl text-white/80">Manage it in Slickhood, then publish an eligible unit to the website with one controlled action.</p></div><Link href="/role" className="shrink-0 rounded-full bg-white px-6 py-3.5 font-bold text-[#EF4217]">List your property</Link></div></section>
    </main><PublicFooter />
  </div>;
}
