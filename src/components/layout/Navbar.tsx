
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { roleDisplayName } from "@/config/businessAreas";
import { decodeServerToken } from "@/lib/actions";
import { usePathname } from "next/navigation";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { SidebarTrigger } from "../ui/sidebar";
import { sidebarLinks } from "@/config/sidebarConfig";

export function Navbar() {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { logout } = useAuth();
    const token = useAuthStore((s) => s.token);
    const activeRole = useAuthStore((s) => s.activeRole);
    const decodedToken = token ? decodeServerToken(token) : null;
    const sub = decodedToken?.sub ?? "User";
    const pathname = usePathname();

    const getCurrentPageTitle = () => {
        for (const link of sidebarLinks) {
            if (link.href === pathname) return link.label;
            if (link.subLinks) {
                const subLink = link.subLinks.find((s) => s.href === pathname);
                if (subLink) return subLink.label;
            }
        }
        return "Dashboard";
    };

    const getCurrentPageDescription = () => {
        for (const link of sidebarLinks) {
            if (link.href === pathname) return link.description;

            if (link.subLinks) {
                const subLink = link.subLinks.find((s) => s.href === pathname);
                if (subLink) return link.description;
            }
        }

        return "Welcome to your dashboard.";
    };

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <>
            <header className="w-full h-16 bg-white dark:bg-[#141130] flex items-center border-b border-gray-100 dark:border-white/10 shrink-0 z-50 sticky top-0 transition-colors">

                {/* Left side */}
                <div className="flex items-center gap-3 px-3">
                    <SidebarTrigger />

                    <div className="flex flex-col">
                        <h1 className="text-lg font-semibold text-[#08184A] dark:text-white">
                            {getCurrentPageTitle()}
                        </h1>

                        <p className="mt-0 text-xs text-gray-500 dark:text-white/60">
                            {getCurrentPageDescription()}
                        </p>
                    </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2 ml-auto pr-3">
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen((prev) => !prev)}
                            className={cn(
                                "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200",
                                "text-[#08184A]/70 dark:text-white/70 hover:text-[#08184A] dark:hover:text-white hover:bg-[#08184A]/5 dark:hover:bg-white/10",
                                dropdownOpen && "bg-[#08184A]/5 dark:bg-white/10 text-[#08184A] dark:text-white"
                            )}
                        >
                            <div className="w-8 h-8 rounded-full bg-[#FF4B12] flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-white" />
                            </div>
                            <div className="hidden sm:flex flex-col items-start leading-tight">
                                <span className="text-sm font-bold text-[#08184A] dark:text-white truncate max-w-[140px]">
                                    {sub}
                                </span>
                                {activeRole && (
                                    <span className="text-xs text-[#08184A]/60 dark:text-white/60 truncate max-w-[140px]">
                                        {roleDisplayName(activeRole.title)}
                                    </span>
                                )}
                            </div>
                            <ChevronDown className={cn(
                                "w-4 h-4 text-[#08184A]/60 dark:text-white/60 transition-transform duration-200",
                                dropdownOpen && "rotate-180"
                            )} />
                        </button>

                        {/* Dropdown */}
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#1A1740] rounded-xl shadow-xl border border-gray-100 dark:border-white/10 overflow-hidden z-50">
                                <div className="px-4 py-3 bg-[#08184A]/5 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                                    <p className="text-sm font-bold text-[#08184A] dark:text-white truncate">{sub}</p>
                                    {activeRole && (
                                        <p className="text-xs text-[#08184A]/50 dark:text-white/50 truncate">{roleDisplayName(activeRole.title)}</p>
                                    )}
                                </div>

                                <div className="py-1">
                                    <Link
                                        href="/dashboard/user"
                                        onClick={() => setDropdownOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-2.5 text-sm font-bold",
                                            "text-[#08184A]/70 dark:text-white/70 transition-all duration-150",
                                            "hover:bg-[#08184A]/10 dark:hover:bg-white/10 hover:text-[#08184A] dark:hover:text-white hover:translate-x-1"
                                        )}
                                    >
                                        <User className="w-4 h-4 shrink-0" />
                                        Profile
                                    </Link>
                                    <Link
                                        href="/dashboard/settings"
                                        onClick={() => setDropdownOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-2.5 text-sm font-bold",
                                            "text-[#08184A]/70 dark:text-white/70 transition-all duration-150",
                                            "hover:bg-[#08184A]/10 dark:hover:bg-white/10 hover:text-[#08184A] dark:hover:text-white hover:translate-x-1"
                                        )}
                                    >
                                        <Settings className="w-4 h-4 shrink-0" />
                                        Settings
                                    </Link>
                                </div>

                                <div className="border-t border-gray-100 dark:border-white/10 py-1">
                                    <button
                                        onClick={() => { setDropdownOpen(false); setShowLogoutDialog(true); }}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold",
                                            "text-[#FF4B12]/80 transition-all duration-150",
                                            "hover:bg-[#FF4B12]/10 hover:text-[#FF4B12] hover:translate-x-1"
                                        )}
                                    >
                                        <LogOut className="w-4 h-4 shrink-0" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You will need to login again to access your account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={logout} className="bg-red-600 hover:bg-red-700">
                            Yes, Logout
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
