"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Can from "@/components/auth/Can";
import { toast } from "sonner";
import {
  Loader2,
  Edit,
  Eye,
  EyeOff,
  Check,
  X,
  Trash2,
  ShieldCheck,
  Shield,
  ShieldOff,
  Info,
  BadgeCheck,
  Copy,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Account, AccountProperty } from "@/types/account";

interface AccountDetailDrawerProps {
  accountId: number | null;
  onClose: () => void;
  onChanged: () => void;
}

interface PropertyFieldState extends AccountProperty {
  isEditing: boolean;
  editValue: string;
  isRevealed: boolean;
  revealedValue: string;
  isRevealing: boolean;
  isSaving: boolean;
  justSaved: boolean;
}

export default function AccountDetailDrawer({
  accountId,
  onClose,
  onChanged,
}: AccountDetailDrawerProps) {
  const {
    handleListAccountDetail,
    handleCreateUpdateAccount,
    handleDecryptEncrypt,
    handleVerifyAccount,
    handleRequestAccountVerification,
    handleDeleteAccount,
  } = useApi();

  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [fields, setFields] = useState<PropertyFieldState[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComments, setRejectComments] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [requestingVerification, setRequestingVerification] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [iconErrored, setIconErrored] = useState(false);

  const isOpen = accountId !== null;

  useEffect(() => {
    if (accountId !== null) {
      setIconErrored(false);
      loadDetail(accountId);
    }
  }, [accountId]);

  const loadDetail = async (id: number) => {
    try {
      setLoading(true);
      const res = await handleListAccountDetail(id);
      const detail: Account | undefined = res?.data?.[0];
      if (res?.success && detail) {
        setAccount(detail);
        setFields(
          (detail.properties || []).map((p) => ({
            ...p,
            isEditing: false,
            editValue: "",
            isRevealed: false,
            revealedValue: "",
            isRevealing: false,
            isSaving: false,
            justSaved: false,
          }))
        );
      }
    } catch (err: any) {
      console.error("Error loading account detail:", err);
      toast.error("Failed to load account", {
        description: err.message || "Please try again",
        descriptionClassName: "!text-black",
      });
    } finally {
      setLoading(false);
    }
  };

  const patchField = (key: string, patch: Partial<PropertyFieldState>) => {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  };

  // Decrypt-on-demand reveal. Re-reveal always re-fetches — toggling off
  // discards the plaintext from state rather than just hiding it, keeping
  // its in-memory lifetime as short as possible.
  const handleReveal = async (field: PropertyFieldState) => {
    if (!account) return;

    if (field.isRevealed) {
      patchField(field.key, { isRevealed: false, revealedValue: "" });
      return;
    }

    patchField(field.key, { isRevealing: true });
    try {
      const res = await handleDecryptEncrypt(account.id, field.key);
      const decrypted: string = res?.data?.[0] ?? "";
      patchField(field.key, { isRevealed: true, revealedValue: decrypted, isRevealing: false });
    } catch (err: any) {
      console.error("Error decrypting property:", err);
      patchField(field.key, { isRevealing: false });
      toast.error("Failed to decrypt value", {
        description: err.message || "Please try again",
        descriptionClassName: "!text-black",
      });
    }
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  // Encrypted fields use a "replace value" interaction: editing always starts
  // from an empty input for a brand-new value rather than pre-filling the
  // current secret. Non-encrypted fields just prefill with the current value.
  const handleStartEdit = (field: PropertyFieldState) => {
    if (field.encrypted) {
      patchField(field.key, { isEditing: true, editValue: "", isRevealed: false, revealedValue: "" });
    } else {
      patchField(field.key, { isEditing: true, editValue: field.value });
    }
  };

  const handleCancel = (field: PropertyFieldState) => {
    patchField(field.key, { isEditing: false, editValue: "" });
  };

  const handleSave = async (field: PropertyFieldState) => {
    if (!account) return;
    // Never submit the mask — this guards against overwriting a real
    // credential with literal asterisks if the field was ever pre-filled.
    if (field.editValue === "*****") return;
    if (field.encrypted && !field.editValue) return;

    patchField(field.key, { isSaving: true });
    try {
      const res = await handleCreateUpdateAccount(account.id, field.key, field.editValue);
      if (res?.success === false) {
        throw new Error(res?.description || "Failed to update property");
      }

      patchField(field.key, {
        isSaving: false,
        isEditing: false,
        editValue: "",
        isRevealed: false,
        revealedValue: "",
        value: field.encrypted ? "*****" : field.editValue,
        justSaved: true,
      });
      setTimeout(() => patchField(field.key, { justSaved: false }), 2000);

      toast.success("Property updated");
      onChanged();
    } catch (err: any) {
      console.error("Error saving property:", err);
      patchField(field.key, { isSaving: false });
      toast.error("Failed to update property", {
        description: err.message || "Please try again",
        descriptionClassName: "!text-black",
      });
    }
  };

  const handleVerify = async () => {
    if (!account) return;
    try {
      setVerifying(true);
      const res = await handleVerifyAccount(account.id, true);
      if (res?.success === false) {
        throw new Error(res?.description || "Failed to verify account");
      }
      // Update-style endpoints on this API return empty data — reload
      // from the server rather than trust/guess the response body.
      await loadDetail(account.id);
      toast.success("Account verified");
      onChanged();
    } catch (err: any) {
      console.error("Error verifying account:", err);
      toast.error("Failed to verify account", {
        description: err.message || "Please try again",
        descriptionClassName: "!text-black",
      });
    } finally {
      setVerifying(false);
    }
  };

  // Reject IS the confirmation step here — the comments dialog replaces the
  // plain confirm, don't stack a second one on top.
  const handleRejectConfirm = async () => {
    if (!account) return;
    const comments = rejectComments.trim();
    if (!comments) return;
    try {
      setRejecting(true);
      const res = await handleVerifyAccount(account.id, false, comments);
      if (res?.success === false) {
        throw new Error(res?.description || "Failed to reject verification");
      }
      // Update-style endpoints on this API return empty data — reload from
      // the server rather than trust/guess the response body. Also checks
      // whether the detail payload echoes the rejection comments back (it
      // may not — only surface them elsewhere in the UI if it does).
      await loadDetail(account.id);
      setRejectOpen(false);
      setRejectComments("");
      toast.success("Verification rejected");
      onChanged();
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

  const handleSendVerificationRequest = async () => {
    if (!account) return;
    try {
      setRequestingVerification(true);
      const res = await handleRequestAccountVerification(account.id);
      if (res?.success === false) {
        throw new Error(res?.description || "Failed to send verification request");
      }
      await loadDetail(account.id);
      toast.success("Verification requested", {
        description: "The superadmin has been notified to review this account.",
        descriptionClassName: "!text-black",
      });
    } catch (err: any) {
      console.error("Error requesting account verification:", err);
      toast.error("Failed to send verification request", {
        description: err.message || "Please try again",
        descriptionClassName: "!text-black",
      });
    } finally {
      setRequestingVerification(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!account) return;
    try {
      setDeleting(true);
      const res = await handleDeleteAccount(account.id);
      if (res?.success === false) {
        throw new Error(res?.description || "Failed to delete account");
      }
      toast.success("Account deleted");
      setDeleteOpen(false);
      onChanged();
      onClose();
    } catch (err: any) {
      console.error("Error deleting account:", err);
      toast.error("Failed to delete account", {
        description: err.message || "Please try again",
        descriptionClassName: "!text-black",
      });
    } finally {
      setDeleting(false);
    }
  };

  const displayFields = fields.filter((f) => f.displayField);
  const configFields = fields.filter((f) => !f.displayField);
  // Best-effort "is this account actually configured" guard for the
  // verification-request button — the API doesn't mark individual
  // properties as required, so "every property has a value" is a proxy.
  const hasUnsetProperties = fields.some((f) => f.value === "");

  const renderField = (field: PropertyFieldState) => {
    const isUnset = field.encrypted && field.value === "";
    const isSetMasked = field.encrypted && field.value === "*****";

    return (
      <div key={field.key} className="p-4 border rounded-lg bg-gray-50 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Label className="text-sm font-semibold" style={{ color: "#141130" }}>
              {field.label}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-500 mt-0.5">{field.description}</p>
            )}
          </div>
          {!field.isEditing && (
            <div className="flex items-center gap-0.5 shrink-0">
              {/* Reveal is only meaningful once a secret has actually been set */}
              {isSetMasked && (
                <button
                  type="button"
                  onClick={() => handleReveal(field)}
                  disabled={field.isRevealing}
                  title={field.isRevealed ? "Hide value" : "Reveal value"}
                  className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  {field.isRevealing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : field.isRevealed ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              )}
              {field.isRevealed && (
                <button
                  type="button"
                  onClick={() => handleCopy(field.revealedValue)}
                  title="Copy value"
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStartEdit(field)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Edit className="w-3.5 h-3.5 mr-1" />
                {field.encrypted ? (isUnset ? "Add" : "Replace") : "Edit"}
              </Button>
            </div>
          )}
        </div>

        {field.isEditing ? (
          <div className="space-y-2">
            <Input
              type={field.encrypted ? "password" : "text"}
              value={field.editValue}
              onChange={(e) => patchField(field.key, { editValue: e.target.value })}
              placeholder={field.encrypted ? "Enter new value" : undefined}
              disabled={field.isSaving}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleSave(field)}
                disabled={field.isSaving || (field.encrypted && !field.editValue)}
                className="text-white"
                style={{ backgroundColor: "#EF4217" }}
              >
                {field.isSaving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleCancel(field)} disabled={field.isSaving}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {isUnset ? (
              <span className="text-gray-400 text-sm italic">Not set</span>
            ) : isSetMasked && field.isRevealed ? (
              <span className="text-gray-900 text-sm break-all font-mono">{field.revealedValue}</span>
            ) : isSetMasked ? (
              <span className="font-mono text-gray-600 text-sm">••••••••••</span>
            ) : field.value ? (
              <span className="text-gray-900 text-sm break-all">{field.value}</span>
            ) : (
              <span className="text-gray-400 text-sm italic">Not set</span>
            )}
            {field.justSaved && <Check className="w-4 h-4 text-green-500" />}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[92dvh]">
          {/*
            Flex column with a bounded height (dvh, not vh — vh ignores the
            mobile browser's collapsing URL bar and causes overflow). Only
            the middle region scrolls (flex-1 + min-h-0); header and footer
            are shrink-0 siblings so the footer buttons are never pushed out
            of view or hidden behind the keyboard.
          */}
          <div className="mx-auto w-full max-w-2xl flex-1 flex flex-col min-h-0 overflow-hidden">
            <DrawerHeader className="shrink-0">
              <DrawerTitle style={{ color: "#141130" }}>Account Details</DrawerTitle>
              <DrawerDescription className="text-gray-600">
                View and configure this payment account
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
              {loading || !account ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#EF4217" }} />
                </div>
              ) : (
                <div className="space-y-6 py-6">
                  {/* Summary card */}
                  <div className="flex items-center gap-4 p-4 rounded-lg border bg-white">
                    {account.iconUrl && !iconErrored ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={account.iconUrl}
                        alt={account.channelDisplayName || account.channel}
                        onError={() => setIconErrored(true)}
                        className="w-12 h-12 rounded-lg object-contain bg-gray-50 shrink-0"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold shrink-0"
                        style={{ backgroundColor: "#EF4217" }}
                      >
                        {(account.channelDisplayName || account.channel)?.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-base truncate" style={{ color: "#141130" }}>
                        {account.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {account.channelDisplayName || account.channel}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                          account.verified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        )}
                      >
                        {account.verified ? (
                          <ShieldCheck className="w-3 h-3" />
                        ) : (
                          <Shield className="w-3 h-3" />
                        )}
                        {account.verified ? "Verified" : "Unverified"}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          account.active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                        )}
                      >
                        {account.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {/* Info callout */}
                  <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Payments will be sent to this account. Credential fields are encrypted — use{" "}
                      <Eye className="w-3 h-3 inline" /> to reveal a set value, or Replace to enter a new one.
                    </p>
                  </div>

                  {/* Verify action */}
                  {!account.verified && (
                    <Can roles={["Superadmin"]}>
                      <div className="flex items-center justify-between p-4 rounded-lg border border-dashed">
                        <div>
                          <p className="text-sm font-medium" style={{ color: "#141130" }}>
                            This account isn&apos;t verified yet
                          </p>
                          <p className="text-xs text-gray-500">
                            Verify it once you&apos;ve confirmed the settings are correct.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleVerify}
                          disabled={verifying}
                          className="text-white shrink-0"
                          style={{ backgroundColor: "#EF4217" }}
                        >
                          {verifying ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                          ) : (
                            <BadgeCheck className="w-4 h-4 mr-1.5" />
                          )}
                          Verify
                        </Button>
                      </div>
                    </Can>
                  )}

                  {/* Reject action — the comments dialog IS the confirmation
                      step for this, no separate plain confirm on top. */}
                  {account.verified && (
                    <Can roles={["Superadmin"]}>
                      <div className="flex items-center justify-between p-4 rounded-lg border border-dashed">
                        <div>
                          <p className="text-sm font-medium" style={{ color: "#141130" }}>
                            This account is verified
                          </p>
                          <p className="text-xs text-gray-500">
                            Reject it if the settings need to be re-checked.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectOpen(true)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 shrink-0"
                        >
                          <ShieldOff className="w-4 h-4 mr-1.5" />
                          Reject request
                        </Button>
                      </div>
                    </Can>
                  )}

                  {/* Summary display fields */}
                  {displayFields.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold" style={{ color: "#141130" }}>
                        Summary
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {displayFields.map(renderField)}
                      </div>
                    </div>
                  )}

                  {/* Config fields */}
                  {configFields.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold" style={{ color: "#141130" }}>
                        Settings
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {configFields.map(renderField)}
                      </div>
                    </div>
                  )}

                  {fields.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-6">
                      No configurable properties for this channel yet.
                    </p>
                  )}
                </div>
              )}
            </div>

            <DrawerFooter className="border-t bg-white pt-4 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] gap-3">
              {account && !account.verified && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block w-full">
                      <Button
                        variant="outline"
                        onClick={handleSendVerificationRequest}
                        disabled={hasUnsetProperties || requestingVerification}
                        className="w-full border-[#EF4217] text-[#EF4217] hover:bg-[#EF4217]/5"
                      >
                        {requestingVerification ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Send verification request
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {hasUnsetProperties
                      ? "Fill in all account properties before requesting verification"
                      : "Ask the superadmin to review and verify this account"}
                  </TooltipContent>
                </Tooltip>
              )}
              <div className="flex gap-3 w-full">
                <DrawerClose asChild>
                  <Button variant="outline" className="flex-1">
                    Close
                  </Button>
                </DrawerClose>
                <Can roles={["Landlord", "Superadmin"]}>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteOpen(true)}
                    disabled={!account}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </Can>
              </div>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &quot;{account?.name}&quot; and its settings. Any payments
              relying on this account will stop working. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={rejectOpen}
        onOpenChange={(o) => {
          setRejectOpen(o);
          if (!o) setRejectComments("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject verification request</DialogTitle>
            <DialogDescription>
              &quot;{account?.name}&quot; will go back to unverified. Let the account owner know why
              so they can fix it and re-request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-comments">Reason for rejection</Label>
            <Textarea
              id="reject-comments"
              placeholder="e.g. Incorrect account details"
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
              maxLength={500}
              disabled={rejecting}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={rejecting}>
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
    </>
  );
}
