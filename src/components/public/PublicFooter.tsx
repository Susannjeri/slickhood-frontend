import Image from "next/image";
import Link from "next/link";
export default function PublicFooter() { return <footer className="bg-[#08184A] text-white">
  <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
    <div><Image src="/slicklogo.svg" width={142} height={40} alt="Slickhood" className="brightness-0 invert" style={{ width: 142, height: 40 }}/><p className="mt-5 max-w-sm text-sm leading-6 text-white/60">The connected platform for property, community, wealth and everyday services.</p></div>
    <div><p className="font-bold">Platform</p><div className="mt-4 flex flex-col gap-2.5 text-sm text-white/65"><Link href="/#ecosystem">Slickhood ecosystem</Link><Link href="/#businesses">Business workspaces</Link><Link href="/role">Choose a role</Link></div></div>
    <div><p className="font-bold">Property</p><div className="mt-4 flex flex-col gap-2.5 text-sm text-white/65"><Link href="/properties/rent">Homes to rent</Link><Link href="/properties/buy">Property for sale</Link><Link href="/role">Manage property</Link></div></div>
    <div><p className="font-bold">Access</p><div className="mt-4 flex flex-col gap-2.5 text-sm text-white/65"><Link href="/login">Sign in</Link><Link href="/role">Create an account</Link><Link href="/forgot-password">Account help</Link></div></div>
  </div><div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/45">© {new Date().getFullYear()} Slickhood. Smarter living. Seamless experience.</div>
  </footer>; }
