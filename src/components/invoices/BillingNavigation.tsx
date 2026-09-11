"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

const receivingSettings: Record<string, string> = {
  Landlord: "/dashboard/accounts",
  EstateManager: "/dashboard/estate/accounts",
  SalesAgent: "/dashboard/sales/accounts",
  ServiceProvider: "/dashboard/merchant-accounts",
  Superadmin: "/dashboard/slickhood-accounts",
  InsuranceManager: "/dashboard/insurance/accounts",
};

const subscriptionRoles = new Set([
  "Landlord", "EstateManager", "SalesAgent", "ServiceProvider",
  "Affiliate", "AssetPortfolioManager", "Superadmin",
]);

/** Navigation only: destination pages and APIs retain their own authorization. */
export function BillingNavigation() {
  const path = usePathname();
  const role = useAuthStore(state => state.activeRole?.title);
  const permissions = useAuthStore(state => state.permissions);
  const settings = role ? receivingSettings[role] : undefined;
  const links = [
    { href: "/dashboard/invoices", label: "Bills & invoices", allowed: permissions.includes("view_invoice_list") },
    { href: "/dashboard/payments", label: "Payment history", allowed: permissions.includes("view_payment_list") },
    { href: settings ?? "", label: "Receiving accounts", allowed: Boolean(settings) && permissions.includes("view_account") },
    { href: "/dashboard/subscriptions", label: "Subscription & billing", allowed: Boolean(role && subscriptionRoles.has(role)) },
    { href: "/dashboard/upgrade-plan", label: "Change plan", allowed: Boolean(role && role !== "Superadmin" && subscriptionRoles.has(role)) },
  ].filter(link => link.allowed);

  if (!links.length) return null;
  return <nav aria-label="Billing" className="flex flex-wrap gap-2">
    {links.map(link => <Link key={link.href} href={link.href}
      aria-current={path === link.href ? "page" : undefined}
      className={`rounded-lg border px-3 py-2 text-sm font-medium ${path === link.href ? "border-orange-200 bg-orange-50 text-orange-700" : "border-gray-200 bg-white text-slate-600 hover:border-orange-300"}`}>
      {link.label}
    </Link>)}
  </nav>;
}
