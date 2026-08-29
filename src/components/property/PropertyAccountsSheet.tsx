"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Wallet,
  Plus,
  Minus,
  Trash2,
  Loader2,
  ShieldCheck,
  Shield,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Account } from "@/types/account";

interface PropertyAccountsSheetProps {
  propertyId: number;
  propertyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Presigned channel icon URLs expire in ~1h (see account-module.md gotchas) —
// never cache/persist them, and always fall back gracefully on load failure.
function ChannelIcon({ account }: { account: Account }) {
  const [errored, setErrored] = useState(false);

  if (!account.iconUrl || errored) {
    return (
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold shrink-0"
        style={{ backgroundColor: "#EF4217" }}
      >
        {(account.channelDisplayName || account.channel)?.charAt(0)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={account.iconUrl}
      alt={account.channelDisplayName || account.channel}
      onError={() => setErrored(true)}
      className="w-10 h-10 rounded-lg object-contain bg-gray-50 shrink-0"
    />
  );
}

function AccountBadges({ account }: { account: Account }) {
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
          account.verified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        )}
      >
        {account.verified ? <ShieldCheck className="w-2.5 h-2.5" /> : <Shield className="w-2.5 h-2.5" />}
        {account.verified ? "Verified" : "Unverified"}
      </span>
      <span
        className={cn(
          "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
          account.active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
        )}
      >
        {account.active ? "Active" : "Inactive"}
      </span>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export default function PropertyAccountsSheet({
  propertyId,
  propertyName,
  open,
  onOpenChange,
}: PropertyAccountsSheetProps) {
  const { handleListPropertyAccounts, handleListAccounts, handleAttachAccount, handleDetachAccount } =
    useApi();

  const [attached, setAttached] = useState<Account[]>([]);
  const [attachedLoading, setAttachedLoading] = useState(false);
  const [attachedError, setAttachedError] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [landlordAccounts, setLandlordAccounts] = useState<Account[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerLoaded, setPickerLoaded] = useState(false);
  const [attachingId, setAttachingId] = useState<number | null>(null);

  const [detachTarget, setDetachTarget] = useState<Account | null>(null);
  const [detaching, setDetaching] = useState(false);

  // Fetch only when the Sheet actually opens — not on page load — and reset
  // per-open state so nothing from a previous property lingers.
  useEffect(() => {
    if (!open) return;
    setPickerOpen(false);
    setPickerLoaded(false);
    setLandlordAccounts([]);
    loadAttached();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, propertyId]);

  const loadAttached = async () => {
    try {
      setAttachedLoading(true);
      setAttachedError(null);
      const res = await handleListPropertyAccounts(propertyId);
      if (res?.success && res.data) {
        setAttached(res.data);
      }
    } catch (err: any) {
      console.error("Error loading property accounts:", err);
      setAttachedError(err?.response?.data?.description || "Failed to load payment accounts");
    } finally {
      setAttachedLoading(false);
    }
  };

  const loadLandlordAccounts = async () => {
    try {
      setPickerLoading(true);
      const res = await handleListAccounts({ byLandlord: true });
      if (res?.success && res.data) {
        setLandlordAccounts(res.data);
      }
      setPickerLoaded(true);
    } catch (err: any) {
      console.error("Error loading landlord accounts:", err);
      toast.error("Failed to load your payment accounts", {
        description: err?.response?.data?.description || "Please try again",
        descriptionClassName: "!text-black",
      });
    } finally {
      setPickerLoading(false);
    }
  };

  const handleTogglePicker = () => {
    const next = !pickerOpen;
    setPickerOpen(next);
    if (next && !pickerLoaded) loadLandlordAccounts();
  };

  const handleAttach = async (account: Account) => {
    try {
      setAttachingId(account.id);
      const res = await handleAttachAccount(account.id, propertyId);
      if (res?.success === false) {
        throw new Error(res?.description || "Failed to attach account");
      }
      toast.success(`${account.name} attached`, {
        description: `Payments for ${propertyName} can now route through this account.`,
        descriptionClassName: "!text-black",
      });
      await loadAttached();
    } catch (err: any) {
      console.error("Error attaching account:", err);
      toast.error("Failed to attach account", {
        description: err?.response?.data?.description || err.message || "Please try again",
        descriptionClassName: "!text-black",
      });
    } finally {
      setAttachingId(null);
    }
  };

  const handleDetachConfirm = async () => {
    if (!detachTarget) return;
    try {
      setDetaching(true);
      const res = await handleDetachAccount(detachTarget.id, propertyId);
      if (res?.success === false) {
        throw new Error(res?.description || "Failed to detach account");
      }
      toast.success(`${detachTarget.name} detached`);
      setDetachTarget(null);
      await loadAttached();
    } catch (err: any) {
      console.error("Error detaching account:", err);
      toast.error("Failed to detach account", {
        description: err?.response?.data?.description || err.message || "Please try again",
        descriptionClassName: "!text-black",
      });
    } finally {
      setDetaching(false);
    }
  };

  // Accounts not yet attached to this property — recomputed from the two
  // already-fetched lists, no extra request needed after an attach/detach.
  const attachedIds = new Set(attached.map((a) => a.id));
  const available = landlordAccounts.filter((a) => !attachedIds.has(a.id));

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[480px] max-h-dvh flex flex-col gap-0 p-0"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Wallet className="w-5 h-5" style={{ color: "#EF4217" }} />
              Payment Accounts
            </SheetTitle>
            <SheetDescription>{propertyName}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">
            {/* Attach toggle + picker */}
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleTogglePicker}
                className="w-full justify-center border-dashed hover:border-[#EF4217] hover:text-[#EF4217]"
              >
                {pickerOpen ? (
                  <Minus className="w-4 h-4 mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Attach account
              </Button>

              {pickerOpen && (
                <div className="border rounded-lg bg-gray-50 p-3 space-y-2">
                  {pickerLoading ? (
                    <>
                      <RowSkeleton />
                      <RowSkeleton />
                    </>
                  ) : landlordAccounts.length === 0 ? (
                    <div className="text-center py-6 px-2">
                      <p className="text-sm text-gray-600">
                        You don&apos;t have any payment accounts yet.
                      </p>
                      <Link
                        href="/dashboard/accounts"
                        className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-[#EF4217] hover:underline"
                      >
                        Create a payment account first
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : available.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      All your payment accounts are already attached to this property.
                    </p>
                  ) : (
                    available.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center gap-3 p-2.5 bg-white border rounded-lg"
                      >
                        <ChannelIcon account={account} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate" style={{ color: "#141130" }}>
                            {account.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {account.channelDisplayName || account.channel}
                          </p>
                          <AccountBadges account={account} />
                          {!account.verified && (
                            <p className="flex items-center gap-1 text-[11px] text-amber-700 mt-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              This account is not yet verified
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAttach(account)}
                          disabled={attachingId === account.id}
                          className="shrink-0 text-white h-11 sm:h-9"
                          style={{ backgroundColor: "#EF4217" }}
                        >
                          {attachingId === account.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Attach"
                          )}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Attached accounts */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Attached ({attachedLoading ? "…" : attached.length})
              </p>

              {attachedLoading ? (
                <div className="space-y-2">
                  <RowSkeleton />
                  <RowSkeleton />
                </div>
              ) : attachedError ? (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {attachedError}
                </div>
              ) : attached.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10 border rounded-lg border-dashed">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                    style={{ backgroundColor: "#FEE2E2" }}
                  >
                    <Wallet className="w-7 h-7" style={{ color: "#EF4217" }} />
                  </div>
                  <p className="font-medium text-gray-700">
                    No payment accounts attached to this property
                  </p>
                  <p className="text-sm text-gray-500 mt-1 mb-4 max-w-[280px]">
                    Attach an account so payments for {propertyName} know where to route.
                  </p>
                  <Button
                    onClick={handleTogglePicker}
                    className="text-white"
                    style={{ backgroundColor: "#EF4217" }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Attach account
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {attached.map((account) => (
                    <li
                      key={account.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-white hover:shadow-sm transition-shadow"
                    >
                      <ChannelIcon account={account} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate" style={{ color: "#141130" }}>
                          {account.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {account.channelDisplayName || account.channel}
                        </p>
                        <AccountBadges account={account} />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDetachTarget(account)}
                        className="shrink-0 h-11 w-11 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title={`Detach ${account.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <SheetFooter className="border-t bg-white px-6 py-4 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <SheetClose asChild>
              <Button variant="outline" className="w-full">
                Close
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!detachTarget} onOpenChange={(o) => !o && setDetachTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Detach this payment account?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{detachTarget?.name}&quot; will stop being a payment route for {propertyName}.
              Payments already in progress are unaffected, but new payments won&apos;t be able to use
              this account for this property.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={detaching}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDetachConfirm}
              disabled={detaching}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {detaching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Detaching...
                </>
              ) : (
                "Detach"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
