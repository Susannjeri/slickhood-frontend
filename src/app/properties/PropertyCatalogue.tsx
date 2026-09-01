import Link from "next/link";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PropertyCard from "@/components/public/PropertyCard";
import { getListingFilters, getListings } from "@/lib/property-listings";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function PropertyCatalogue({ type, searchParams }: {
  type: "RENT" | "SALE";
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;
  const one = (key: string) => typeof raw[key] === "string" ? raw[key] as string : undefined;
  const [result, filters] = await Promise.all([
    getListings(type, {
      location: one("location"),
      unitType: one("unitType"),
      minPrice: one("minPrice"),
      maxPrice: one("maxPrice"),
      page: one("page"),
    }),
    getListingFilters(type),
  ]);
  const rent = type === "RENT";
  const currentPage = result.page;
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const key of ["location", "unitType", "minPrice", "maxPrice"]) {
      const value = one(key);
      if (value) params.set(key, value);
    }
    if (page > 0) params.set("page", String(page));
    const query = params.toString();
    return query ? `?${query}` : ".";
  };

  return <div className="min-h-screen bg-[#fbfaf8] text-[#141130]">
    <PublicHeader />
    <main>
      <section className="bg-[#141130] px-5 py-16 text-white">
        <div className="mx-auto max-w-7xl lg:px-3">
          <p className="text-sm font-bold uppercase tracking-[.2em] text-[#ff8d68]">Slickhood property</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">{rent ? "Homes to rent" : "Property for sale"}</h1>
          <p className="mt-4 max-w-2xl text-white/65">Browse active listings published from managed property records and contact the responsible property team directly.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-5">
          <input name="location" defaultValue={one("location")} maxLength={80} placeholder="Town or neighbourhood" aria-label="Town or neighbourhood" className="rounded-xl border border-slate-300 px-3 py-3 sm:col-span-2" />
          <select name="unitType" defaultValue={one("unitType") || ""} aria-label="Unit type" className="rounded-xl border border-slate-300 bg-white px-3 py-3">
            <option value="">Any unit type</option>
            {filters.unitTypes.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input name="maxPrice" type="number" min="0" defaultValue={one("maxPrice")} placeholder="Maximum price" aria-label="Maximum price" className="rounded-xl border border-slate-300 px-3 py-3" />
          <button className="rounded-xl bg-[#EF4217] px-5 py-3 font-bold text-white">Search</button>
        </form>
        <div className="mt-10">
          <h2 className="text-2xl font-black">{result.totalElements} {result.totalElements === 1 ? "property" : "properties"}</h2>
        </div>
        {result.items.length
          ? <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{result.items.map(item => <PropertyCard key={item.slug} listing={item} />)}</div>
          : <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center"><h2 className="text-xl font-bold">No properties match those filters yet.</h2><p className="mt-2 text-sm text-slate-500">Try a wider location or price range.</p></div>}
        {result.totalPages > 1 && <nav aria-label="Property catalogue pages" className="mt-10 flex items-center justify-center gap-4">
          {currentPage > 0
            ? <Link rel="prev" href={pageHref(currentPage - 1)} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold">Previous</Link>
            : <span className="rounded-xl border border-slate-200 px-5 py-3 text-slate-400">Previous</span>}
          <span className="text-sm text-slate-600">Page {currentPage + 1} of {result.totalPages}</span>
          {currentPage + 1 < result.totalPages
            ? <Link rel="next" href={pageHref(currentPage + 1)} className="rounded-xl bg-[#141130] px-5 py-3 font-bold text-white">Next</Link>
            : <span className="rounded-xl border border-slate-200 px-5 py-3 text-slate-400">Next</span>}
        </nav>}
      </section>
    </main>
    <PublicFooter />
  </div>;
}
