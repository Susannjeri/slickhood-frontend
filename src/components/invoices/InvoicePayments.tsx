"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Invoice, Payment, PaymentItem, transformPayment } from "@/types/invoice";
import { useApi } from "@/hooks/useApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard, Download, Loader2, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  invoice: Invoice;
  triggerFetch: boolean;
  refetchKey: number;
}

const DEFAULT_PAGE_SIZE = 10;

export function InvoicePayments({ invoice, triggerFetch, refetchKey }: Props) {
  const { handleListPayments } = useApi();

  const [payments, setPayments]     = useState<Payment[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage]             = useState(0);

  // User-controlled pagination settings
  const [pageSize, setPageSize]     = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort]             = useState("id,desc");

  // Page input — separate from committed page so user can type freely
  const [pageInput, setPageInput]   = useState("1");

  const [searchInput, setSearchInput]   = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const cache = useRef<Map<string, { payments: Payment[]; totalPages: number; totalElements: number }>>(new Map());

  const fetchPayments = useCallback(async (p: number, size: number, s: string, bustCache = false) => {
    const cacheKey = `${invoice.ref}::${p}::${size}::${s}::${refetchKey}`;

    if (!bustCache && cache.current.has(cacheKey)) {
      const cached = cache.current.get(cacheKey)!;
      setPayments(cached.payments);
      setTotalPages(cached.totalPages);
      setTotalElements(cached.totalElements);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await handleListPayments({
        page: p,
        size,
        sort: s,
        filter: invoice.ref,
      });
      const transformed: Payment[] = (res.data ?? []).map((item: PaymentItem) => transformPayment(item));
      const tp = res.totalPages ?? 0;
      const te = res.totalElements ?? 0;
      cache.current.set(cacheKey, { payments: transformed, totalPages: tp, totalElements: te });
      setPayments(transformed);
      setTotalPages(tp);
      setTotalElements(te);
    } catch {
      setError("Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }, [invoice.ref, refetchKey, handleListPayments]);

  // Reset everything when the invoice changes — new ref means a fresh fetch
  useEffect(() => {
    setPage(0);
    setPageInput("1");
    setPayments([]);
    setTotalPages(0);
    setTotalElements(0);
    setSearchInput("");
    setActiveSearch("");
    // Don't fetch here — triggerFetch effect below will handle it if accordion is open
  }, [invoice.ref]);

  // Reset and fetch when accordion opens or refetchKey changes
  useEffect(() => {
    if (!triggerFetch) return;
    setPage(0);
    setPageInput("1");
    fetchPayments(0, pageSize, sort, true); // always bust cache on open/refetch
  }, [triggerFetch, invoice.ref, refetchKey]);

  // Fetch when page changes (from pagination controls)
  useEffect(() => {
    if (!triggerFetch || page === 0) return; // page 0 already handled above
    fetchPayments(page, pageSize, sort);
  }, [page]);

  // When pageSize or sort changes, reset to page 0 and refetch
  const handlePageSizeChange = (val: string) => {
    const size = Number(val);
    setPageSize(size);
    setPage(0);
    setPageInput("1");
    fetchPayments(0, size, sort, true);
  };

  const handleSortChange = (val: string) => {
    setSort(val);
    setPage(0);
    setPageInput("1");
    fetchPayments(0, pageSize, val, true);
  };

  // Commit page input — clamp to valid range
  const handlePageInputCommit = () => {
    const parsed = parseInt(pageInput, 10);
    if (isNaN(parsed)) { setPageInput(String(page + 1)); return; }
    const clamped = Math.max(1, Math.min(parsed, totalPages)) - 1;
    setPageInput(String(clamped + 1));
    if (clamped !== page) setPage(clamped);
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handlePageInputCommit();
  };

  const goTo = (p: number) => {
    setPage(p);
    setPageInput(String(p + 1));
  };

  // Client-side search on current page
  const filtered = payments.filter(p =>
    activeSearch === "" ||
    p.channel.toLowerCase().includes(activeSearch.toLowerCase()) ||
      p.transId && p.transId.toLowerCase().includes(activeSearch.toLowerCase())
  );

  const handleSearch  = () => setActiveSearch(searchInput);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };
  const handleClearSearch = () => { setSearchInput(""); setActiveSearch(""); };

  const multiPage = totalPages > 1;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[#EF4217]" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">
        {error}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by channel or ref..."
            className="h-8 text-xs pl-8 pr-8"
          />
          {searchInput && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <Button
          onClick={handleSearch}
          className="h-8 px-3 text-xs bg-[#EF4217] hover:bg-[#d63a13] text-white shrink-0"
        >
          Search
        </Button>
      </div>

      {/* Pagination controls — only when multiple pages exist */}
      {multiPage && !activeSearch && (
        <div className="flex flex-wrap items-center gap-2 py-2 border-y border-gray-100">

          {/* Page size */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 whitespace-nowrap">Per page:</span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map(n => (
                  <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 whitespace-nowrap">Sort:</span>
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id,desc" className="text-xs">Newest first</SelectItem>
                <SelectItem value="id,asc" className="text-xs">Oldest first</SelectItem>
                <SelectItem value="amount,desc" className="text-xs">Amount (high)</SelectItem>
                <SelectItem value="amount,asc" className="text-xs">Amount (low)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Page navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page === 0}
              onClick={() => goTo(page - 1)}
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>

            {/* Direct page input */}
            <div className="flex items-center gap-1">
              <Input
                value={pageInput}
                onChange={e => setPageInput(e.target.value)}
                onBlur={handlePageInputCommit}
                onKeyDown={handlePageInputKeyDown}
                className="h-7 w-10 text-xs text-center px-1"
              />
              <span className="text-xs text-gray-400 whitespace-nowrap">/ {totalPages}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page + 1 >= totalPages}
              onClick={() => goTo(page + 1)}
            >
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>

          {/* Total count */}
          <span className="text-xs text-gray-400 w-full text-right">
            {totalElements} payment{totalElements !== 1 ? "s" : ""} total
          </span>
        </div>
      )}

      {/* Payment cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CreditCard className="w-8 h-8 text-gray-300" />
          <p className="text-sm text-gray-400">
            {activeSearch
              ? `No payments matching "${activeSearch}".`
              : `No payments found for ${invoice.ref}.`
            }
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(p => (
            <PaymentCard key={p.id} payment={p} />
          ))}
        </div>
      )}

    </div>
  );
}

function PaymentCard({ payment }: { payment: Payment }) {
  const { handleViewPaymentReceipt } = useApi();
  const [receiptLoading, setReceiptLoading] = useState(false);

  const downloadReceipt = async () => {
    setReceiptLoading(true);
    try {
      const blob = await handleViewPaymentReceipt(payment.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `receipt_${payment.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Receipt could not be downloaded. Please try again.");
    } finally {
      setReceiptLoading(false);
    }
  };

  const getAmountColor = () => {
    if (payment.inProgress) return 'text-orange-500';
    return payment.success ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#141130] tracking-wide">
          {payment.transId}
        </span>
        <span className={`text-sm font-bold ${getAmountColor()}`}>
           {payment.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      </div>
      {/* Processing Statement: Shown only when in progress */}
      {payment.inProgress && (
          <div className="flex items-center gap-2 text-[11px] text-orange-600 font-semibold bg-orange-50 p-2">
            <span className="animate-pulse">●</span>
            Transaction is processing, please wait...
          </div>
      )}

      {!payment.success && !payment.inProgress &&  (
          <div className="text-xs text-red-500 font-medium italic bg-red-50 p-2">
            {payment.description}
          </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{payment.channel}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{payment.createdOn}</span>
          {payment.success && !payment.inProgress && payment.transId && (
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={downloadReceipt} disabled={receiptLoading}>
              {receiptLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Receipt
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
