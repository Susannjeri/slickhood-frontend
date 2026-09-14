"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import RequireRole from "@/components/auth/RequireRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ActiveLease, listActiveLeases } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/authStore";

const readable = (value?: string) => value?.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase()) ?? "Pending";
const leaseStatus = (lease: ActiveLease) => {
  if (lease.lifecycleStatus === "NOTICE_GIVEN") return "Termination notice issued";
  if (lease.lifecycleStatus === "TERMINATED") return "Tenancy ended";
  if (lease.signed) return "Occupied";
  if (lease.agreementStatus === "PARTIALLY_SIGNED") return lease.tenantSignDate ? "Awaiting landlord signature" : "Awaiting tenant signature";
  if (lease.agreementStatus === "SIGNED") return "Lease signed";
  if (["ISSUED", "ACKNOWLEDGED"].includes(lease.agreementStatus ?? "")) return "Awaiting tenant signature";
  return "Tenant onboarding";
};

export default function TenantDirectoryPage() {
  const token = useAuthStore(state => state.token);
  const permissions = useAuthStore(state => state.permissions);
  const [items, setItems] = useState<ActiveLease[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await listActiveLeases(page, 25, token, search);
      setItems(response.data?.data ?? []);
      setTotalPages(response.data?.totalPages ?? 0);
      setTotalElements(response.data?.totalElements ?? 0);
    } catch (reason: unknown) {
      setError(apiErrorMessage(reason, "The tenant directory could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [page, search, token]);

  useEffect(() => { void load(); }, [load]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  };

  return (
    <RequireRole roles={["Landlord", "PropertyManager", "WorkspaceAdmin", "LeasingOfficer", "Superadmin"]} permissions={["view_active_lease"]}>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#EF4217]">Rental portfolio</p>
          <h1 className="mt-1 text-3xl font-bold">Tenants</h1>
          <p className="text-muted-foreground">View tenants, their units, lease status, documents and billing without changing their identity details.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-[#EF4217]" />Tenant directory</CardTitle>
            <CardDescription>{totalElements} tenancy record{totalElements === 1 ? "" : "s"} in your authorised property scope.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={submitSearch} className="flex max-w-2xl flex-col gap-2 sm:flex-row">
              <Input aria-label="Search tenants" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Search tenant, email, property or unit…" />
              <Button type="submit" variant="outline"><Search className="mr-2 h-4 w-4" />Search</Button>
              {search && <Button type="button" variant="ghost" onClick={() => { setSearchInput(""); setPage(0); setSearch(""); }}>Clear</Button>}
            </form>
            {loading && <p role="status" className="py-8 text-center text-muted-foreground">Loading tenants…</p>}
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error} <Button type="button" size="sm" variant="outline" onClick={() => void load()}>Retry</Button></div>}
            {!loading && !error && items.length === 0 && <p className="py-8 text-center text-muted-foreground">{search ? "No tenants match your search." : "No tenancy records are available in this workspace."}</p>}
            {!loading && !error && items.map(lease => (
              <div key={lease.id} className="flex flex-col justify-between gap-4 rounded-lg border p-4 lg:flex-row lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{lease.tenantName || lease.tenantEmail || `Tenant #${lease.tenantUserId}`}</strong>
                    <Badge variant={lease.signed ? "default" : "outline"}>{leaseStatus(lease)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{lease.tenantEmail}{lease.tenantPhoneNumber ? ` · ${lease.tenantPhoneNumber}` : ""}</p>
                  <p className="text-sm text-muted-foreground">{lease.propertyName || `Property #${lease.propertyId}`} / {lease.unitRef || `Unit #${lease.unitId}`} · {lease.currency} {lease.price?.toLocaleString()} · Move-in {lease.moveInDate ?? "pending"}</p>
                  <p className="text-xs text-muted-foreground">Lease #{lease.id} · Document {readable(lease.agreementStatus)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lease.unitId && lease.propertyId && <Button size="sm" variant="outline" asChild><Link href={`/dashboard/unit/details/${lease.unitId}?p=${lease.propertyId}&from=rentals`}>View unit</Link></Button>}
                  {lease.unitId && <Button size="sm" variant="outline" asChild><Link href={`/dashboard/documents?leaseId=${lease.id}&unitId=${lease.unitId}`}>Lease documents</Link></Button>}
                  {lease.unitId && <Button size="sm" variant="outline" asChild><Link href={`/dashboard/invoices?unitId=${lease.unitId}&tenantId=${lease.tenantUserId ?? ""}`}>Billing</Link></Button>}
                  {permissions.includes("edit_unit") && lease.unitId && lease.propertyId && <Button size="sm" asChild><Link href={`/dashboard/unit/details/${lease.unitId}?p=${lease.propertyId}&from=rentals`}>Manage</Link></Button>}
                </div>
              </div>
            ))}
            {!error && totalPages > 1 && <div className="flex items-center justify-between border-t pt-4"><Button variant="outline" disabled={page === 0 || loading} onClick={() => setPage(value => value - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span><Button variant="outline" disabled={page >= totalPages - 1 || loading} onClick={() => setPage(value => value + 1)}>Next</Button></div>}
          </CardContent>
        </Card>
      </div>
    </RequireRole>
  );
}
