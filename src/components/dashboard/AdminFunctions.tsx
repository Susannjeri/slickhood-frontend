"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { sidebarLinks, settingsLinks, type SidebarLink } from "@/config/sidebarConfig";
import { useAuthStore } from "@/store/authStore";
import { normalizedRoleTitle } from "@/config/businessAreas";

const groups = [
  { title: "People & verification", links: ["Users & Staff", "KYC Reviews", "Team User Types", "Help Desk", "Privacy Centre"] },
  { title: "Finance & subscriptions", links: ["Subscriptions", "SlickHood Accounts", "Recipient Payment Accounts", "Invoices", "Payments", "Affiliate Management", "Community Funds", "Tax Administration"] },
  { title: "Property & marketplace", links: ["Property Type Catalogue", "Property Listing Moderation", "Estate Management", "Property Sale Management", "Service Management", "Soko Management", "Insurance Operations", "Wealth Management"] },
  { title: "Security & system operations", links: ["Visitors", "Visitor Management", "Smart Gates", "Documents & Notices", "Notifications", "Reports", "Audit Logs", "Global Config", "User Parameters"] },
];
const links = new Map([...sidebarLinks, ...settingsLinks.flatMap(link => link.subLinks ?? [])].map(link => [link.label, link]));
export const adminFunctionGroups = groups.map(group => ({ ...group, links: group.links.map(label => links.get(label)).filter((link): link is SidebarLink => !!link?.href) }));

export function AdminFunctions() {
  const role = useAuthStore(s => s.activeRole);
  const [search, setSearch] = useState("");
  if (normalizedRoleTitle(role?.title) !== "superadmin") return null;
  const visible = adminFunctionGroups.map(group => ({ ...group, links: group.links.filter(link =>
    (!link.permissions.length || link.permissions.some(permission => role?.permissions.includes(permission)))
    && `${link.label} ${link.description ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())) }));
  return <section id="admin-functions" aria-labelledby="admin-functions-heading" className="scroll-mt-24 rounded-2xl border bg-white p-5 dark:bg-slate-950">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 id="admin-functions-heading" className="text-xl font-bold">Administration</h2>
        <p className="mt-1 text-sm text-muted-foreground">Open the live workspaces for reviews, configuration and operations. Permissions remain enforced in each module.</p></div>
      <input aria-label="Find an admin function" placeholder="Find an admin function" value={search} onChange={event => setSearch(event.target.value)} className="rounded-lg border bg-transparent p-2" />
    </div>
    <div className="mt-5 grid gap-6 md:grid-cols-2">{visible.filter(group => group.links.length).map(group => <div key={group.title}>
      <h3 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{group.title}</h3>
      <div className="grid gap-2">{group.links.map(link => <Link key={link.label} href={link.href!} className="group flex items-start justify-between gap-3 rounded-xl border p-3 hover:border-orange-500 focus-visible:outline-2 focus-visible:outline-orange-500">
        <div><span className="font-medium">{link.label === "Subscriptions" ? "Subscription catalogue" : link.label}</span>
          {link.description && link.label !== "Subscriptions" && <p className="mt-1 text-xs text-muted-foreground">{link.description}</p>}</div><ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
      </Link>)}</div>
    </div>)}</div>
    {!visible.some(group => group.links.length) && <p className="py-6 text-sm text-muted-foreground">No matching authorized functions.</p>}
  </section>;
}
