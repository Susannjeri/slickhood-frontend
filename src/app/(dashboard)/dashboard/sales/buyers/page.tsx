"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Building2, Mail, Search, UserCheck, Users } from "lucide-react";
import RequireRole from "@/components/auth/RequireRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/api-error";
import { salesService } from "@/services/business-workflows.service";
import { SaleStatus, SaleTransaction } from "@/types/business-workflows";

const statusLabels: Record<SaleStatus, string> = {
  LEAD: "Buyer invited",
  VIEWING: "Viewing arranged",
  OFFERED: "Letter of offer sent",
  RESERVED: "Offer accepted",
  DUE_DILIGENCE: "Due diligence",
  AGREEMENT: "Sale agreement",
  COMPLETION: "Transfer and handover",
  COMPLETED: "Purchase completed",
  CANCELLED: "Cancelled",
};

const buyerIdentity = (item: SaleTransaction) =>
  item.buyerName ||
  item.buyerEmail ||
  item.invitedBuyerEmail ||
  (item.buyerUserId ? `Buyer #${item.buyerUserId}` : "Invited buyer");
const buyerEmail = (item: SaleTransaction) => item.buyerEmail || item.invitedBuyerEmail;

export default function BuyerDirectoryPage() {
  const [items, setItems] = useState<SaleTransaction[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await salesService.list({ page, size: 25, search: search || undefined });
      setItems(response.data?.data ?? []);
      setTotalPages(response.data?.totalPages ?? 0);
      setTotalElements(response.data?.totalElements ?? 0);
    } catch (reason: unknown) {
      setError(apiErrorMessage(reason, "The buyer directory could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [load]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  };

  const activeOnPage = items.filter(item => !["COMPLETED", "CANCELLED"].includes(item.status)).length;
  const pendingAccountsOnPage = items.filter(item => !item.buyerUserId && item.status !== "CANCELLED").length;

  return (
    <RequireRole roles={["SalesAgent", "SalesCoordinator", "ListingAgent"]} permissions={["view_sale_pipeline"]}>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#EF4217]">Property sales</p>
            <h1 className="mt-1 text-3xl font-bold">Buyers</h1>
            <p className="text-muted-foreground">View each buyer-unit journey, contact, offer status, documents and next operational action.</p>
          </div>
          <Button asChild className="bg-[#EF4217]"><Link href="/dashboard/sales#invite-buyer">Invite buyer</Link></Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardDescription>Buyer journeys</CardDescription><CardTitle>{loading ? "—" : totalElements}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Active on this page</CardDescription><CardTitle>{loading ? "—" : activeOnPage}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Awaiting account acceptance</CardDescription><CardTitle>{loading ? "—" : pendingAccountsOnPage}</CardTitle></CardHeader></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-[#EF4217]" />Buyer directory</CardTitle>
            <CardDescription>Each record represents one buyer and assigned sale unit in your authorised workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={submitSearch} className="flex max-w-2xl flex-col gap-2 sm:flex-row">
              <Input aria-label="Search buyers" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Search buyer, email, property or unit…" />
              <Button type="submit" variant="outline"><Search className="mr-2 h-4 w-4" />Search</Button>
              {search && <Button type="button" variant="ghost" onClick={() => { setSearchInput(""); setPage(0); setSearch(""); }}>Clear</Button>}
            </form>

            {loading && <p role="status" className="py-8 text-center text-muted-foreground">Loading buyers…</p>}
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error} <Button type="button" size="sm" variant="outline" onClick={() => void load()}>Retry</Button></div>}
            {!loading && !error && items.length === 0 && <p className="py-8 text-center text-muted-foreground">{search ? "No buyers match your search." : "No buyer journeys are available in this workspace."}</p>}

            {!loading && !error && items.map(item => (
              <div key={item.id} className="flex flex-col justify-between gap-4 rounded-lg border p-4 lg:flex-row lg:items-center">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{buyerIdentity(item)}</strong>
                    <Badge variant={item.status === "CANCELLED" ? "destructive" : item.status === "COMPLETED" ? "default" : "outline"}>{statusLabels[item.status]}</Badge>
                    <Badge variant="secondary">{item.buyerUserId ? "SlickHood account linked" : "Invitation pending"}</Badge>
                  </div>
                  {buyerEmail(item) && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" />{buyerEmail(item)}</p>}
                  <p className="flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="h-4 w-4" />{item.propertyName || `Property #${item.propertyId}`} / {item.unitRef || `Unit #${item.unitId}`}</p>
                  <p className="text-sm">Asking: {item.currency} {item.askingPrice.toLocaleString()}{item.offerAmount ? ` · Offer: ${item.currency} ${item.offerAmount.toLocaleString()}` : ""}</p>
                  <p className="text-xs text-muted-foreground">Sale #{item.id} · {item.buyerUserId ? "Buyer onboarding completed" : "Waiting for the invited buyer to sign in or register"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild><Link href={`/dashboard/unit/details/${item.unitId}?p=${item.propertyId}&from=sale-units`}>View unit</Link></Button>
                  <Button size="sm" variant="outline" asChild><Link href={`/dashboard/documents?saleId=${item.id}`}>Documents</Link></Button>
                  {item.escrowInvoiceId && <Button size="sm" variant="outline" asChild><Link href={`/dashboard/invoices?invoiceId=${item.escrowInvoiceId}`}>Billing</Link></Button>}
                  <Button size="sm" asChild><Link href={`/dashboard/sales?saleId=${item.id}#sale-${item.id}`}><UserCheck className="mr-2 h-4 w-4" />Manage sale</Link></Button>
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
