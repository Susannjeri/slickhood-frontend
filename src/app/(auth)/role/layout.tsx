
import type { ReactNode } from "react";
import Link from "next/link";
import { BackgroundPattern } from "@/components/layout/BackgroundPattern";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F4F6FB] dark:bg-[#0D0B1F] flex flex-col transition-colors">

      {/* Navbar */}
      <header className="w-full bg-white dark:bg-[#141130] border-b border-gray-100 dark:border-white/10 transition-colors">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-[#141130] dark:text-white">Slick</span>
            <span className="text-xl font-bold text-[#EF4217]">Hood</span>
          </Link>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#EF4217] hover:text-[#d63600] transition-colors">
              Login
            </Link>
          </p>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-4 sm:py-6">
        <div className="relative isolate w-full max-w-5xl flex">
          <BackgroundPattern />
          <div className="pointer-events-none absolute -top-10 -left-16 w-72 h-72 rounded-full bg-[#EEF2FC] dark:bg-[#13203a] blur-3xl opacity-60" />
          <div className="pointer-events-none absolute -bottom-12 -right-12 w-72 h-72 rounded-full bg-[#EAF0FB] dark:bg-[#101a30] blur-3xl opacity-60" />

          {/* Orange accent bar */}
          <div className="hidden sm:block w-1.5 rounded-l-2xl bg-[#EF4217]" />

          {/* Card */}
          <div className="flex-1 bg-white dark:bg-[#1A1740] rounded-2xl sm:rounded-l-none shadow-sm border border-gray-100 dark:border-white/10 px-5 sm:px-8 py-5 sm:py-7 transition-colors">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white dark:bg-[#141130] border-t border-gray-100 dark:border-white/10 transition-colors">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-0">
            <span className="text-base font-bold text-[#141130] dark:text-white">Slick</span>
            <span className="text-base font-bold text-[#EF4217]">Hood</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">Always One Step Ahead</span>
          </div>

          <nav className="flex items-center gap-5 text-xs text-gray-500 dark:text-gray-400">
            <Link href="/help" className="hover:text-[#EF4217] transition-colors">Help Center</Link>
            <Link href="/privacy" className="hover:text-[#EF4217] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#EF4217] transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-[#EF4217] transition-colors">Contact Support</Link>
          </nav>

          <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
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
