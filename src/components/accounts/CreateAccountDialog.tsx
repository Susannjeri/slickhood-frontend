"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuthStore } from "@/store/authStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, ArrowLeft, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { AccountCategory, PaymentChannelType } from "@/types/account";
import { API } from "@/lib/api";
import type { accountCategory, paymentChannel } from "@/lib/api";

interface CreateAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (accountId: number) => void;
  // When provided, this decides which create endpoint is called — the page
  // is the branch, not an implicit activeRole check. Falls back to
  // activeRole-based detection when omitted (back-compat for any caller
  // that doesn't know its category up front).
  forceCategory?: AccountCategory;
}

const STEPS = [
  { id: 1, label: "Setup Method" },
  { id: 2, label: "Payment Setup" },
  { id: 3, label: "Complete" },
];

function ChannelIcon({ channel }: { channel: PaymentChannelType }) {
  const [errored, setErrored] = useState(false);

  if (!channel.iconUrl || errored) {
    return (
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold text-white shrink-0"
        style={{ backgroundColor: "#EF4217" }}
      >
        {channel.name?.charAt(0)?.toUpperCase() || "?"}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={channel.iconUrl}
      alt={channel.name}
      onError={() => setErrored(true)}
      className="w-10 h-10 rounded-lg object-contain shrink-0 bg-gray-50"
    />
  );
}

export default function CreateAccountDialog({
  open,
  onClose,
  onCreated,
  forceCategory,
}: CreateAccountDialogProps) {
  const { handleActivePaymentChannels, handleCreateLandlordAccount, handleCreateSlickHoodAccount, handleCreateMerchantAccount } =
    useApi();
  const activeRole = useAuthStore((s) => s.activeRole);
  const isSuperadmin = forceCategory
    ? forceCategory === "SLICKHOOD"
    : activeRole?.title === "Superadmin";

  const [step, setStep] = useState(1);
  const [channels, setChannels] = useState<PaymentChannelType[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannelType | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdAccountId, setCreatedAccountId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      resetState();
      loadChannels();
    }
    // load only when the dialog opens; the API handlers are stable store adapters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resetState = () => {
    setStep(1);
    setSelectedChannel(null);
    setName("");
    setCreatedAccountId(null);
  };

  const loadChannels = async () => {
    try {
      setLoadingChannels(true);
      const res = await handleActivePaymentChannels();
      if (res?.success && res.data) {
        setChannels(res.data);
      }
    } catch (err: unknown) {
      console.error("Error loading payment channels:", err);
      toast.error("Failed to load payment channels", {
        description: err instanceof Error ? err.message : "Please try again",
        descriptionClassName: "!text-black",
      });
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleSelectChannel = (channel: PaymentChannelType) => {
    setSelectedChannel(channel);
    setStep(2);
  };

  const handleCreate = async () => {
    if (!selectedChannel) return;
    if (!name.trim()) {
      toast.error("Please enter an account name");
      return;
    }

    try {
      setCreating(true);
      const category = forceCategory ?? (isSuperadmin ? "SLICKHOOD" : "LANDLORD");
      const res = category === "COMMUNITY_FUND"
        ? (await API.post("/account/create",{channel:selectedChannel.id,name:name.trim(),category})).data
        : await (category === "SLICKHOOD" ? handleCreateSlickHoodAccount : category === "MERCHANT" ? handleCreateMerchantAccount : handleCreateLandlordAccount)(selectedChannel.id as paymentChannel, name.trim(), category as accountCategory);

      const created = Array.isArray(res?.data) ? res.data[0] : res?.data;
      if (res?.success && created?.id) {
        setCreatedAccountId(created.id);
        setStep(3);
        toast.success("Account created", {
          description: `${name.trim()} has been created`,
          descriptionClassName: "!text-black",
        });
      } else {
        throw new Error(res?.description || "Failed to create account");
      }
    } catch (err: unknown) {
      console.error("Error creating account:", err);
      toast.error("Failed to create account", {
        description: err instanceof Error ? err.message : "Please try again",
        descriptionClassName: "!text-black",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleFinish = (configureNow: boolean) => {
    if (createdAccountId && configureNow) {
      onCreated(createdAccountId);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle style={{ color: "#141130" }}>Add Payment Account</DialogTitle>
          <DialogDescription>
            {isSuperadmin
              ? "Create a platform-level SlickHood payment account"
              : "Create a payment account to receive your collections"}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center px-1">
          {STEPS.map((s, i) => {
            const done = s.id < step;
            const active = s.id === step;
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                      done
                        ? "bg-green-500 border-green-500 text-white"
                        : active
                        ? "border-[#EF4217] text-white"
                        : "bg-white border-gray-300 text-gray-400"
                    }`}
                    style={active ? { backgroundColor: "#EF4217" } : undefined}
                  >
                    {done ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <span
                    className="text-[10px] font-medium whitespace-nowrap"
                    style={{ color: done ? "#22c55e" : active ? "#EF4217" : "#9ca3af" }}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-2 mt-3.5 ${s.id < step ? "bg-green-500" : "bg-gray-200"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: choose channel */}
        {step === 1 && (
          <div className="space-y-3 py-2">
            {loadingChannels ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#EF4217" }} />
              </div>
            ) : channels.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No payment channels are available right now.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => handleSelectChannel(channel)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 text-left transition-colors hover:border-[#EF4217] hover:bg-[#EF4217]/5"
                  >
                    <ChannelIcon channel={channel} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm" style={{ color: "#141130" }}>
                        {channel.name}
                      </p>
                      {channel.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">{channel.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: name + create */}
        {step === 2 && selectedChannel && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border">
              <ChannelIcon channel={selectedChannel} />
              <div>
                <p className="font-medium text-sm" style={{ color: "#141130" }}>
                  {selectedChannel.name}
                </p>
                <p className="text-xs text-gray-500">{selectedChannel.description}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-name">Account Name</Label>
              <Input
                id="account-name"
                placeholder="e.g. Main Collections"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-gray-500">A name to help you identify this account later.</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} disabled={creating} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 text-white"
                style={{ backgroundColor: "#EF4217" }}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: complete */}
        {step === 3 && (
          <div className="space-y-5 py-4 text-center">
            <div
              className="w-14 h-14 mx-auto rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#FEE2E2" }}
            >
              <PartyPopper className="w-7 h-7" style={{ color: "#EF4217" }} />
            </div>
            <div>
              <h3 className="font-semibold text-lg" style={{ color: "#141130" }}>
                Account created
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Now configure the settings so payments can flow through this account.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => handleFinish(false)} className="flex-1">
                Do it later
              </Button>
              <Button
                onClick={() => handleFinish(true)}
                className="flex-1 text-white"
                style={{ backgroundColor: "#EF4217" }}
              >
                Configure now
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
