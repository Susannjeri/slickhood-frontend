import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { AUTH_SLIDES, AUTH_SERVICES } from "@/lib/auth-slider.config";
import { AuthSlider } from "@/components/auth/AuthSlider";
import { AuthServicesStrip } from "@/components/auth/AuthServicesStrip";

interface AuthSplitLayoutProps {
  children: ReactNode;
  /** Custom content for the right panel. Omit to use the default slider + services band. */
  rightPanel?: ReactNode;
  /** Optional back-navigation link rendered above the logo. */
  backLink?: { href: string; label: string };
}

function DefaultRightPanel() {
  return (
    <>
      <div className="flex-1 min-h-0">
        <AuthSlider slides={AUTH_SLIDES} className="" />
      </div>
      <div className="shrink-0 bg-[#141130] px-10 py-10">
        <AuthServicesStrip items={AUTH_SERVICES} />
      </div>
    </>
  );
}

export function AuthSplitLayout({ children, rightPanel, backLink }: AuthSplitLayoutProps) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen lg:overflow-hidden">

      {/* ── Left panel: form (35% on desktop) ──────────────────── */}
      <div className="w-full lg:w-[35%] shrink-0 flex flex-col bg-white dark:bg-[#1A1740] transition-colors lg:h-full lg:overflow-y-auto">

        {/* Back link — pinned at very top, its own row */}
        {backLink && (
          <div className="px-8 pt-5 shrink-0">
            <Link
              href={backLink.href}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-[#EF4217] transition-colors"
            >
              <ChevronLeft size={13} aria-hidden="true" />
              {backLink.label}
            </Link>
          </div>
        )}

        {/* Logo */}
        <div className="px-8 pt-5 pb-2 shrink-0">
          <Link href="/" aria-label="SlickHood home" className="inline-block">
            <Image src="/slickhood.png" alt="SlickHood" width={140} height={40} className="h-9 w-auto" priority />
          </Link>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Smarter living. Seamless experience.
          </p>
        </div>

        {/* Form — vertically centered in remaining space */}
        <div className="flex-1 flex items-center justify-center px-8 py-8">
          <div className="w-full max-w-[370px]">
            {children}
          </div>
        </div>
      </div>

      {/* ── Right panel (65% on desktop) ─────────────────────────
           flex-col so slider/content and services band stack
           top-to-bottom with no padding or gaps.               */}
      <div className="hidden lg:flex flex-1 flex-col overflow-hidden">
        {rightPanel ?? <DefaultRightPanel />}
      </div>

    </div>
  );
}
