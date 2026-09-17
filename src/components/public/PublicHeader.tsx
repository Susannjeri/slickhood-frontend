import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";

const publicLinks = [
  ["Ecosystem", "/#ecosystem"],
  ["Who it’s for", "/#businesses"],
  ["Properties", "/properties/rent"],
] as const;

export default function PublicHeader() {
  return <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
    <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
      <Link href="/" aria-label="Slickhood corporate home" className="flex items-center gap-3"><Image src="/slicklogo.svg" width={142} height={40} alt="Slickhood" priority style={{ width: 142, height: 40 }} /></Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm font-semibold text-[#101b3f] md:flex">{publicLinks.map(([label,href])=><Link key={label} href={href} className="transition hover:text-[#EF4217]">{label}</Link>)}</nav>
      <div className="hidden items-center gap-3 md:flex"><Link href="/login" className="px-3 py-2 text-sm font-bold text-[#101b3f] hover:text-[#EF4217]">Sign in</Link><Link href="/role" className="rounded-full bg-[#EF4217] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#d93612]">Get started</Link></div>
      <details className="group relative md:hidden"><summary aria-label="Open navigation" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 bg-white"><Menu className="h-5 w-5"/></summary><div className="absolute right-0 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"><nav aria-label="Mobile navigation" className="flex flex-col">{publicLinks.map(([label,href])=><Link key={label} href={href} className="rounded-xl px-4 py-3 text-sm font-semibold hover:bg-slate-50">{label}</Link>)}<div className="my-2 border-t"/><Link href="/login" className="rounded-xl px-4 py-3 text-sm font-semibold">Sign in</Link><Link href="/role" className="mt-1 rounded-xl bg-[#EF4217] px-4 py-3 text-center text-sm font-bold text-white">Get started</Link></nav></div></details>
    </div>
  </header>;
}
