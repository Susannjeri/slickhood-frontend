import Link from "next/link";
export default function PublicFooter() { return <footer className="bg-[#141130] text-white">
  <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:grid-cols-3 lg:px-8">
    <div><p className="text-xl font-bold">Slickhood</p><p className="mt-3 max-w-sm text-sm text-white/65">A trusted place to discover, manage and grow property relationships.</p></div>
    <div><p className="font-semibold">Explore</p><div className="mt-3 flex flex-col gap-2 text-sm text-white/70"><Link href="/properties/rent">Homes to rent</Link><Link href="/properties/buy">Property for sale</Link></div></div>
    <div><p className="font-semibold">Property owners</p><div className="mt-3 flex flex-col gap-2 text-sm text-white/70"><Link href="/role">Create an account</Link><Link href="/login">Manage listings</Link></div></div>
  </div><div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/50">© {new Date().getFullYear()} Slickhood. Powered by Slickhood.</div>
  </footer>; }
