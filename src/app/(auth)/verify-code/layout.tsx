
import type { ReactNode } from "react";
import Link from "next/link";
import { BackgroundPattern } from "@/components/layout/BackgroundPattern";

export default function VerifyCodeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F4F6FB] dark:bg-[#0D0B1F] flex flex-col transition-colors">

      <header className="w-full bg-white dark:bg-[#141130] border-b border-gray-100 dark:border-white/10 shrink-0 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center">
            <span className="text-lg sm:text-xl font-bold text-[#141130] dark:text-white">Slick</span>
            <span className="text-lg sm:text-xl font-bold text-[#EF4217]">Hood</span>
          </Link>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="hidden sm:inline">Already have an account? </span>
            <Link href="/login" className="font-semibold text-[#EF4217] hover:text-[#d63600] transition-colors">
              Login
            </Link>
          </p>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="relative isolate w-full max-w-5xl">
          <BackgroundPattern />
          <div className="pointer-events-none absolute -top-10 -left-16 w-72 h-72 rounded-full bg-[#EEF2FC] dark:bg-[#13203a] blur-3xl opacity-60" />
          <div className="pointer-events-none absolute -bottom-12 -right-12 w-72 h-72 rounded-full bg-[#EAF0FB] dark:bg-[#101a30] blur-3xl opacity-60" />

          <div className="relative rounded-3xl bg-white dark:bg-[#1A1740] border border-gray-100 dark:border-white/10 transition-colors">
            <div className="absolute left-4 top-8 bottom-8 w-1.5 rounded-full bg-[#EF4217]" />
            <div className="pl-10 pr-5 sm:pl-16 sm:pr-12 py-8 sm:py-10">
              {children}
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full bg-white dark:bg-[#141130] border-t border-gray-100 dark:border-white/10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-[#141130] dark:text-white">Slick</span>
            <span className="text-base font-bold text-[#EF4217]">Hood</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 hidden sm:inline">Always One Step Ahead</span>
          </div>
          <nav className="flex items-center gap-4 sm:gap-5 text-xs text-gray-500 dark:text-gray-400">
            <Link href="/help" className="hover:text-[#EF4217] transition-colors">Help Center</Link>
            <Link href="/privacy" className="hover:text-[#EF4217] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#EF4217] transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-[#EF4217] transition-colors">Contact Support</Link>
          </nav>
          <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              System Online
            </span>
            <span>Version 1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
