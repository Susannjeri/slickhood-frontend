"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronLeft, ChevronRight, CreditCard, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { listPayments } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PaymentRow {
  id: number;
  amount: number;
  customerName?: string;
  customerAccount?: string;
  transId?: string;
  channel?: string | { name?: string };
  category?: string;
  createdOn?: string;
  status?: string;
  description?: string;
  inProgress: boolean;
  success: boolean;
}

const channelName = (value: PaymentRow["channel"]) => typeof value === "string" ? value : value?.name ?? "—";

export default function PaymentsPage() {
  const token = useAuthStore(state => state.token);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await listPayments({ page, size: 25, sort: "id,desc", filter }, token);
      setRows((response.data?.data ?? []) as PaymentRow[]);
      setTotalPages(Math.max(1, Number(response.data?.totalPages ?? 1)));
      setTotalElements(Number(response.data?.totalElements ?? response.data?.data?.length ?? 0));
    } catch {
      toast.error("Payments could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [filter, page, token]);

  useEffect(() => { void load(); }, [load]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(0);
    setFilter(search.trim());
  };

  return <div className="mx-auto w-full max-w-[1450px] space-y-6 p-4 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="flex items-center gap-2 text-3xl font-bold text-[#08184a] dark:text-white"><CreditCard className="h-7 w-7 text-[#ef4217]" /> Payments</h1><p className="mt-2 text-sm text-slate-500">Role-scoped payment activity and transaction status.</p></div>
      <Button asChild variant="outline"><Link href="/dashboard/reports"><BarChart3 className="mr-2 h-4 w-4" />Reconciliation report</Link></Button>
    </div>

    <Card><CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Transactions</CardTitle><p className="mt-1 text-sm text-slate-500">{totalElements.toLocaleString()} matching payments</p></div><form onSubmit={submitSearch} className="flex w-full gap-2 sm:max-w-md"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Reference, customer, channel or status" className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" /></div><Button type="submit">Search</Button></form></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 dark:bg-white/5"><tr>{["Date", "Transaction", "Customer", "Channel", "Category", "Amount", "Status"].map(label => <th key={label} className="whitespace-nowrap border-b px-5 py-3 text-left font-semibold">{label}</th>)}</tr></thead><tbody>
          {loading && <tr><td colSpan={7} className="p-12 text-center text-slate-500"><RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading payments…</td></tr>}
          {!loading && rows.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-slate-500">No payments were found.</td></tr>}
          {!loading && rows.map(payment => <tr key={payment.id} className="border-b hover:bg-slate-50 dark:hover:bg-white/5"><td className="whitespace-nowrap px-5 py-3">{payment.createdOn ? new Date(payment.createdOn).toLocaleString("en-KE") : "—"}</td><td className="px-5 py-3 font-mono text-xs">{payment.transId || `#${payment.id}`}</td><td className="px-5 py-3"><div className="font-medium">{payment.customerName || "—"}</div><div className="text-xs text-slate-400">{payment.customerAccount || ""}</div></td><td className="px-5 py-3">{channelName(payment.channel)}</td><td className="px-5 py-3">{payment.category || "—"}</td><td className="whitespace-nowrap px-5 py-3 font-semibold">{Number(payment.amount ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td><td className="px-5 py-3"><Badge variant={payment.success ? "default" : payment.inProgress ? "secondary" : "destructive"}>{payment.success ? "Successful" : payment.inProgress ? "Pending" : payment.status || "Exception"}</Badge></td></tr>)}
        </tbody></table></div>
        <div className="flex items-center justify-between border-t p-4 text-sm"><span>Page {page + 1} of {totalPages}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 0 || loading} onClick={() => setPage(value => value - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Button><Button size="sm" variant="outline" disabled={page + 1 >= totalPages || loading} onClick={() => setPage(value => value + 1)}>Next <ChevronRight className="h-4 w-4" /></Button></div></div>
      </CardContent>
    </Card>
  </div>;
}
