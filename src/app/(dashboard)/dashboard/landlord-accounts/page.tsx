"use client";

import { useEffect, useRef, useState } from "react";
import { useApi } from "@/hooks/useApi";
import RequireRole from "@/components/auth/RequireRole";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, ShieldCheck, Shield, ShieldOff, BadgeCheck, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Account } from "@/types/account";
import { PaymentChannelType } from "@/types/account";

function ChannelCell({ account }: { account: Account }) {
  const [errored, setErrored] = useState(false);

  if (!account.iconUrl || errored) {
    return (
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold shrink-0"
          style={{ backgroundColor: "#EF4217" }}
        >
          {(account.channelDisplayName || account.channel)?.charAt(0)}
        </div>
        <span className="font-medium text-sm" style={{ color: "#141130" }}>
          {account.name}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={account.iconUrl}
        alt={account.channelDisplayName || account.channel}
        onError={() => setErrored(true)}
        className="w-8 h-8 rounded-lg object-contain bg-gray-50 shrink-0"
      />
      <span className="font-medium text-sm" style={{ color: "#141130" }}>
        {account.name}
      </span>
    </div>
  );
}

function LandlordAccountsOversightPage() {
  const { handleListAccounts, handleActivePaymentChannels, handleVerifyAccount } = useApi();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [activeFilter, setActiveFilter] = useState<"any" | "true" | "false">("any");
  const [verifiedFilter, setVerifiedFilter] = useState<"any" | "true" | "false">("any");
  const [channelFilter, setChannelFilter] = useState<string>("any");
  const [emailFilter, setEmailFilter] = useState("");
  const [debouncedEmailFilter, setDebouncedEmailFilter] = useState("");

  const [channels, setChannels] = useState<PaymentChannelType[]>([]);

  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Account | null>(null);
  const [rejectComments, setRejectComments] = useState("");
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    handleActivePaymentChannels()
      .then((res) => {
        if (res?.success && res.data) setChannels(res.data);
      })
      .catch((err) => console.error("Error loading payment channels:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmailFilter(emailFilter);
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [emailFilter]);

  useEffect(() => {
    setPage(0);
  }, [activeFilter, verifiedFilter, channelFilter]);

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, activeFilter, verifiedFilter, channelFilter, debouncedEmailFilter]);

  // Guards against out-of-order responses when filters/page change quickly.
  const requestIdRef = useRef(0);

  const loadAccounts = async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError(null);
      // byLandlord intentionally omitted here — this view is platform-wide
      // oversight of ALL landlords' accounts, not the superadmin's own. See
      // account-module.md: "don't guess" which boolean value that'd need.
      const res = await handleListAccounts({
        page,
        size: pageSize,
        sort: "id,desc",
        active: activeFilter === "any" ? undefined : activeFilter === "true",
        verified: verifiedFilter === "any" ? undefined : verifiedFilter === "true",
        channel: channelFilter === "any" ? undefined : channelFilter,
        landlordEmail: debouncedEmailFilter || undefined,
      });

      if (requestId !== requestIdRef.current) return; // superseded

      if (res?.success && res.data) {
        setAccounts(res.data);
        setTotalPages(res.totalPages || 0);
        setTotalElements(res.totalElements || 0);
      }
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      console.error("Error loading landlord accounts:", err);
      setError(err.message || "Failed to load accounts");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const handleVerify = async (account: Account) => {
    try {
      setVerifyingId(account.id);
      const res = await handleVerifyAccount(account.id, true);
      if (res?.success === false) {
        throw new Error(res?.description || "Failed to verify account");
      }
      toast.success(`${account.name} verified`);
      loadAccounts();
    } catch (err: any) {
      console.error("Error verifying account:", err);
      toast.error("Failed to verify account", {
        description: err.message || "Please try again",
        descriptionClassName: "!text-black",
      });
    } finally {
      setVerifyingId(null);
    }
  };

  // The comments dialog IS the confirmation step here — reject requires a
  // reason, so there's no separate plain confirm on top of it.
  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    const comments = rejectComments.trim();
    if (!comments) return;
    try {
      setRejecting(true);
      const res = await handleVerifyAccount(rejectTarget.id, false, comments);
      if (res?.success === false) {
        throw new Error(res?.description || "Failed to reject verification");
      }
      toast.success(`${rejectTarget.name} rejected`);
      setRejectTarget(null);
      setRejectComments("");
      loadAccounts();
    } catch (err: any) {
      console.error("Error rejecting account verification:", err);
      toast.error("Failed to reject verification", {
        description: err.message || "Please try again",
        descriptionClassName: "!text-black",
      });
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <Breadcrumb items={[{ label: "Landlord Accounts" }]} />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#141130]">Landlord Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Oversight of all landlords&apos; payment accounts platform-wide
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Landlord email..."
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Active" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Active: Any</SelectItem>
            <SelectItem value="true">Active: Yes</SelectItem>
            <SelectItem value="false">Active: No</SelectItem>
          </SelectContent>
        </Select>
        <Select value={verifiedFilter} onValueChange={(v) => setVerifiedFilter(v as typeof verifiedFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Verified" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Verified: Any</SelectItem>
            <SelectItem value="true">Verified: Yes</SelectItem>
            <SelectItem value="false">Verified: No</SelectItem>
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Payment channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Channel: Any</SelectItem>
            {channels.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Loading */}
      {loading && accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin mb-4" style={{ color: "#EF4217" }} />
          <p className="text-gray-500">Loading accounts...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border">
          <Wallet className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-500">No landlord accounts match these filters.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50 border-b">
                    <TableHead className="font-semibold text-[#141130] pl-4 min-w-[180px]">Account</TableHead>
                    <TableHead className="font-semibold text-[#141130]">Landlord Email</TableHead>
                    <TableHead className="font-semibold text-[#141130]">Channel</TableHead>
                    <TableHead className="font-semibold text-[#141130]">Active</TableHead>
                    <TableHead className="font-semibold text-[#141130]">Verified</TableHead>
                    <TableHead className="font-semibold text-[#141130]">Created</TableHead>
                    <TableHead className="font-semibold text-[#141130] text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id} className="border-b last:border-0">
                      <TableCell className="pl-4 py-3">
                        <ChannelCell account={account} />
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-600">
                        {/* ⚠️ landlordEmail field on Account is unconfirmed — see types/account.ts */}
                        {account.landlordEmail ?? "—"}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-600">
                        {account.channelDisplayName || account.channel}
                      </TableCell>
                      <TableCell className="py-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            account.active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                          )}
                        >
                          {account.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                            account.verified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                          )}
                        >
                          {account.verified ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                          {account.verified ? "Verified" : "Unverified"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-500">
                        {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="py-3 text-right pr-4">
                        {!account.verified ? (
                          <Button
                            size="sm"
                            onClick={() => handleVerify(account)}
                            disabled={verifyingId === account.id}
                            className="text-white"
                            style={{ backgroundColor: "#EF4217" }}
                          >
                            {verifyingId === account.id ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <BadgeCheck className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Verify
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectTarget(account)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          >
                            <ShieldOff className="w-3.5 h-3.5 mr-1.5" />
                            Reject request
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{page * pageSize + 1}</span> to{" "}
              <span className="font-medium">{Math.min((page + 1) * pageSize, totalElements)}</span> of{" "}
              <span className="font-medium">{totalElements}</span> accounts
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={page === 0}>First</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 0}>Previous</Button>
              <span className="px-3 py-1 text-sm">
                Page <span className="font-medium">{page + 1}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>Next</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>Last</Button>
            </div>
          </div>
        </>
      )}

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRejectTarget(null);
            setRejectComments("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject verification request</DialogTitle>
            <DialogDescription>
              &quot;{rejectTarget?.name}&quot; will go back to unverified. Let the account owner know
              why so they can fix it and re-request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="landlord-reject-comments">Reason for rejection</Label>
            <Textarea
              id="landlord-reject-comments"
              placeholder="e.g. Incorrect account details"
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
              maxLength={500}
              disabled={rejecting}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={rejecting}>
              Cancel
            </Button>
            <Button
              onClick={handleRejectConfirm}
              disabled={rejecting || !rejectComments.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {rejecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LandlordAccountsPage() {
  return (
    <RequireRole roles={["Superadmin"]}>
      <LandlordAccountsOversightPage />
    </RequireRole>
  );
}
