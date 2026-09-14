"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import { toast } from "sonner";
import RequireRole from "@/components/auth/RequireRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiErrorMessage } from "@/lib/api-error";
import { SubscriberRecord, getSubscribers, updateSubscriberAutoRenew } from "@/services/subscription.service";
import { useAuthStore } from "@/store/authStore";

const products = ["LANDLORD", "ESTATE_MANAGEMENT", "PROPERTY_SALES", "MY_WEALTH", "SERVICES", "SOKO", "AFFILIATE", "GATE_MANAGEMENT_ADDON", "LISTING_ADDON", "PORTFOLIO_MANAGEMENT_ADDON"];
const statuses = ["PENDING", "ACTIVE", "EXPIRED", "SUSPENDED", "CANCELLED"];
const label = (value?: string) => value?.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase()) ?? "Not set";
const date = (value?: string) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "Open-ended";

export default function SubscribersPage() {
  const token = useAuthStore(state => state.token);
  const [items, setItems] = useState<SubscriberRecord[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [product, setProduct] = useState("all");
  const [selected, setSelected] = useState<SubscriberRecord | null>(null);
  const [autoRenew, setAutoRenew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await getSubscribers(token, {
        page,
        size: 25,
        search: search || undefined,
        status: status === "all" ? undefined : status,
        product: product === "all" ? undefined : product,
      });
      setItems(response.data?.data ?? []);
      setTotalPages(response.data?.totalPages ?? 0);
      setTotalElements(response.data?.totalElements ?? 0);
    } catch (reason: unknown) {
      setError(apiErrorMessage(reason, "The subscriber directory could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [page, product, search, status, token]);

  useEffect(() => { void load(); }, [load]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  };

  const openEdit = (record: SubscriberRecord) => {
    setSelected(record);
    setAutoRenew(record.autoRenew);
  };

  const save = async () => {
    if (!selected || !token) return;
    setSaving(true);
    try {
      await updateSubscriberAutoRenew(token, selected.subscriptionId, autoRenew);
      toast.success("Subscriber renewal preference updated.");
      setSelected(null);
      await load();
    } catch (reason: unknown) {
      toast.error(apiErrorMessage(reason, "The subscriber could not be updated."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireRole roles={["Superadmin"]} permissions={["view_subscription_plan"]}>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#EF4217]">SlickHood administration</p>
          <h1 className="mt-1 text-3xl font-bold">Subscribers</h1>
          <p className="text-muted-foreground">Review each subscriber, product, plan, term and renewal preference. Billing and identity records remain in their governed modules.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-[#EF4217]" />Subscriber directory</CardTitle>
            <CardDescription>{totalElements} subscription record{totalElements === 1 ? "" : "s"} match the current filters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={submitSearch} className="grid gap-2 md:grid-cols-[minmax(240px,1fr)_220px_220px_auto]">
              <Input aria-label="Search subscribers" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Search name, email or plan…" />
              <Select value={status} onValueChange={value => { setPage(0); setStatus(value); }}><SelectTrigger aria-label="Filter by subscription status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map(value => <SelectItem key={value} value={value}>{label(value)}</SelectItem>)}</SelectContent></Select>
              <Select value={product} onValueChange={value => { setPage(0); setProduct(value); }}><SelectTrigger aria-label="Filter by product"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All products</SelectItem>{products.map(value => <SelectItem key={value} value={value}>{label(value)}</SelectItem>)}</SelectContent></Select>
              <Button type="submit" variant="outline"><Search className="mr-2 h-4 w-4" />Search</Button>
            </form>
            {loading && <p role="status" className="py-8 text-center text-muted-foreground">Loading subscribers…</p>}
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error} <Button size="sm" variant="outline" onClick={() => void load()}>Retry</Button></div>}
            {!loading && !error && items.length === 0 && <p className="py-8 text-center text-muted-foreground">No subscriptions match these filters.</p>}
            {!loading && !error && items.map(record => (
              <div key={record.subscriptionId} className="flex flex-col justify-between gap-4 rounded-lg border p-4 lg:flex-row lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><strong>{record.fullName || record.email}</strong><Badge>{label(record.status)}</Badge><Badge variant="outline">{label(record.accountStatus)}</Badge></div>
                  <p className="mt-1 text-sm text-muted-foreground">{record.email}{record.phoneNumber ? ` · ${record.phoneNumber}` : ""}</p>
                  <p className="text-sm text-muted-foreground">{label(record.product || record.role)} · {record.planCode} · {date(record.startAt)} to {date(record.endAt)}</p>
                  <p className="text-xs text-muted-foreground">Subscription #{record.subscriptionId} · Auto-renew {record.autoRenew ? "on" : "off"}</p>
                </div>
                <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(record)}>View / edit</Button><Button size="sm" variant="outline" asChild><Link href={`/dashboard/invoices?tenantId=${record.userId}`}>View billing</Link></Button></div>
              </div>
            ))}
            {!error && totalPages > 1 && <div className="flex items-center justify-between border-t pt-4"><Button variant="outline" disabled={page === 0 || loading} onClick={() => setPage(value => value - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span><Button variant="outline" disabled={page >= totalPages - 1 || loading} onClick={() => setPage(value => value + 1)}>Next</Button></div>}
          </CardContent>
        </Card>
        <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open && !saving) setSelected(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Subscriber details</DialogTitle><DialogDescription>Contact and term details are read-only here. Renewal preference is the only editable subscription setting on this screen.</DialogDescription></DialogHeader>
            {selected && <div className="space-y-4"><div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2"><p><span className="text-sm text-muted-foreground">Subscriber</span><br/><strong>{selected.fullName || selected.email}</strong></p><p><span className="text-sm text-muted-foreground">Email</span><br/><strong>{selected.email}</strong></p><p><span className="text-sm text-muted-foreground">Product</span><br/><strong>{label(selected.product || selected.role)}</strong></p><p><span className="text-sm text-muted-foreground">Plan</span><br/><strong>{selected.planCode}</strong></p><p><span className="text-sm text-muted-foreground">Status</span><br/><strong>{label(selected.status)}</strong></p><p><span className="text-sm text-muted-foreground">Term</span><br/><strong>{date(selected.startAt)} to {date(selected.endAt)}</strong></p></div><div className="flex items-center justify-between rounded-lg border p-4"><div><Label htmlFor="subscriber-auto-renew">Automatic renewal</Label><p className="text-sm text-muted-foreground">Charge and renew only through the normal verified subscription checkout.</p></div><Switch id="subscriber-auto-renew" checked={autoRenew} onCheckedChange={setAutoRenew} /></div></div>}
            <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setSelected(null)}>Close</Button><Button disabled={saving || autoRenew === selected?.autoRenew} onClick={() => void save()}>{saving ? "Saving…" : "Save change"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequireRole>
  );
}
