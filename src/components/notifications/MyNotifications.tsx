"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCircle2, Clock3, Loader2, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-error";
import { MyNotification, notificationService } from "@/services/notification.service";

const PAGE_SIZE = 10;

export function MyNotifications() {
  const [items, setItems] = useState<MyNotification[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await notificationService.mine(page, PAGE_SIZE);
      setItems(response.data?.data ?? []);
      setTotalPages(response.data?.totalPages ?? 0);
      setTotalElements(response.data?.totalElements ?? 0);
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Could not load your notifications."));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  return <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#EF4217]"><Bell /></div>
      <div><h1 className="text-3xl font-bold text-[#141130]">Your notifications</h1><p className="text-sm text-muted-foreground">Payment reminders, estate updates and delivery confirmations · {totalElements} total</p></div>
    </div>
    {loading && items.length === 0 ? <div className="flex justify-center rounded-xl border bg-white py-20"><Loader2 className="h-8 w-8 animate-spin text-[#EF4217]" /></div> :
      items.length === 0 ? <div className="rounded-xl border bg-white py-16 text-center"><Bell className="mx-auto mb-3 h-10 w-10 text-slate-300"/><h2 className="font-semibold">You are all caught up</h2><p className="mt-1 text-sm text-muted-foreground">New estate and payment updates will appear here.</p></div> :
      <div className="space-y-3">{items.map(item => <article key={item.id} className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-2"><span className="text-slate-500">{item.channel === "EMAIL" ? <Mail className="h-4 w-4"/> : <MessageSquare className="h-4 w-4"/>}</span><strong>{item.notificationType.replaceAll("_", " ")}</strong></div><Badge variant={item.delivered ? "default" : "outline"}>{item.delivered ? <CheckCircle2 className="mr-1 h-3 w-3"/> : <Clock3 className="mr-1 h-3 w-3"/>}{item.delivered ? "Delivered" : "Processing"}</Badge></div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message}</p><time className="mt-3 block text-xs text-muted-foreground" dateTime={item.createdOn}>{new Date(item.createdOn).toLocaleString()}</time>
      </article>)}</div>}
    <div className="flex items-center justify-between"><Button variant="outline" disabled={page === 0 || loading} onClick={() => setPage(value => value - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {totalPages === 0 ? 0 : page + 1} of {totalPages}</span><Button variant="outline" disabled={loading || page + 1 >= totalPages} onClick={() => setPage(value => value + 1)}>Next</Button></div>
  </div>;
}
