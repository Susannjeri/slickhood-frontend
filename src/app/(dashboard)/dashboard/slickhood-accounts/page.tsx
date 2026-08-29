"use client";

import RequireRole from "@/components/auth/RequireRole";
import AccountsListPage from "@/components/accounts/AccountsListPage";

// Page 3 — the superadmin's own platform-level SlickHood payment accounts.
// Functional mirror of the Landlord Accounts page (Page 1), sharing
// AccountsListPage; category is hardcoded here rather than inferred from
// role, so this page is the branch, not an activeRole check inside a shared
// component.
export default function SlickHoodAccountsPage() {
  return (
    <RequireRole roles={["Superadmin"]}>
      <AccountsListPage
        category="SLICKHOOD"
        title="SlickHood Accounts"
        description="Manage the platform's own payment accounts"
        emptyCollectionsCopy="Create a SlickHood account to start receiving platform-level collections."
        // byLandlord intentionally omitted — these accounts aren't
        // landlord-owned, and the exact param semantics for this page
        // weren't confirmed against the backend (see account-module.md).
      />
    </RequireRole>
  );
}
