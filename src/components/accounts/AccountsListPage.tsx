"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Loader2, Plus, Wallet, ShieldCheck, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Account, AccountCategory } from "@/types/account";
import { ListAccountsParams } from "@/lib/api";
import CreateAccountDialog from "@/components/accounts/CreateAccountDialog";
import AccountDetailDrawer from "@/components/accounts/AccountDetailDrawer";

function AccountIcon({ account }: { account: Account }) {
  const [errored, setErrored] = useState(false);

  if (!account.iconUrl || errored) {
    return (
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center text-white font-semibold shrink-0"
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
      className="w-11 h-11 rounded-lg object-contain bg-gray-50 shrink-0"
    />
  );
}

interface AccountsListPageProps {
  category: AccountCategory;
  title: string;
  description: string;
  emptyCollectionsCopy: string;
  listParams?: ListAccountsParams;
}

// Shared by the Landlord Accounts page and the Superadmin SlickHood
// Accounts page — same list/create/detail-drawer UI, just parameterized by
// which category of account it manages. The page component decides the
// category (via which route/RequireRole reached it); this component never
// branches on role itself. Mirrors the UnitTypeListPage(leaseMode) pattern.
export default function AccountsListPage({
  category,
  title,
  description,
  emptyCollectionsCopy,
  listParams,
}: AccountsListPageProps) {
  const { handleListAccounts } = useApi();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailAccountId, setDetailAccountId] = useState<number | null>(null);

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await handleListAccounts(listParams);
      if (res?.success && res.data) {
        setAccounts(res.data.filter((account: Account) => account.category === category));
      }
    } catch (err: any) {
      console.error("Error loading accounts:", err);
      setError(err.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreated = (accountId: number) => {
    setCreateOpen(false);
    loadAccounts();
    setDetailAccountId(accountId);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <Breadcrumb items={[{ label: title }]} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#141130]">{title}</h1>
            <p className="text-muted-foreground mt-1">{description}</p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="group relative flex items-center px-5 py-2.5 text-white font-medium rounded-lg transition-all duration-300 ease-out hover:bg-[#d93712] hover:shadow-[0_0_20px_rgba(239,66,23,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EF4217]"
            style={{ backgroundColor: "#EF4217" }}
          >
            <Plus className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
            <span>Add Account</span>
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin mb-4" style={{ color: "#EF4217" }} />
          <p className="text-gray-500">Loading accounts...</p>
        </div>
      ) : accounts.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "#FEE2E2" }}
          >
            <Wallet className="w-10 h-10" style={{ color: "#EF4217" }} />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-[#141130]">No payment accounts yet</h3>
          <p className="text-gray-500 mb-6 text-center max-w-md">{emptyCollectionsCopy}</p>
          <Button onClick={() => setCreateOpen(true)} className="text-white" style={{ backgroundColor: "#EF4217" }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>
      ) : (
        /* Card grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => setDetailAccountId(account.id)}
              className="text-left bg-white border rounded-lg p-4 space-y-3 hover:border-[#EF4217] hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <AccountIcon account={account} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate" style={{ color: "#141130" }}>
                    {account.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {account.channelDisplayName || account.channel}
                  </p>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {account.category}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                    account.verified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  )}
                >
                  {account.verified ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                  {account.verified ? "Verified" : "Unverified"}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    account.active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                  )}
                >
                  {account.active ? "Active" : "Inactive"}
                </span>
              </div>

              {account.createdAt && (
                <p className="text-xs text-gray-400">
                  Created {new Date(account.createdAt).toLocaleDateString()}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      <CreateAccountDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        forceCategory={category}
      />

      <AccountDetailDrawer
        accountId={detailAccountId}
        onClose={() => setDetailAccountId(null)}
        onChanged={loadAccounts}
      />
    </div>
  );
}
