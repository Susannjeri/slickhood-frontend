"use client";

import RequireRole from "@/components/auth/RequireRole";
import AccountsListPage from "@/components/accounts/AccountsListPage";

// Page 1 — Landlord's own payment accounts. Locked to the Landlord role;
// Superadmin has its own separate pages (Landlord Accounts oversight,
// SlickHood Accounts) rather than sharing this route.
export default function AccountsPage() {
  return (
    <RequireRole roles={["Landlord"]} permissions={["view_account"]}>
      <AccountsListPage
        category="LANDLORD"
        title="Payment Accounts"
        description="Manage the payment rails your collections flow through"
        emptyCollectionsCopy="Create a payment account to start receiving your collections."
        listParams={{ byLandlord: true }}
      />
    </RequireRole>
  );
}
