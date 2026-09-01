import Image from "next/image";
import Link from "next/link";

export default function PublicHeader() {
  return <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
      <Link href="/" aria-label="Slickhood home" className="flex items-center gap-3">
        <Image src="/slicklogo.svg" width={142} height={40} alt="Slickhood" priority />
      </Link>
      <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-6 text-sm font-medium text-[#141130]">
        <Link href="/properties/rent" className="hover:text-[#EF4217]">Rent</Link>
        <Link href="/properties/buy" className="hover:text-[#EF4217]">Buy</Link>
        <Link href="/login" className="hidden sm:inline hover:text-[#EF4217]">Sign in</Link>
        <Link href="/role" className="rounded-full bg-[#EF4217] px-4 py-2.5 text-white shadow-sm hover:bg-[#d93612]">List a property</Link>
      </nav>
    </div>
  </header>;
}
