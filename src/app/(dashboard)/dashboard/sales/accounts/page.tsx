"use client";

import RequireRole from "@/components/auth/RequireRole";
import AccountsListPage from "@/components/accounts/AccountsListPage";

export default function SalesAccountsPage() {
  return (
    <RequireRole roles={["SalesAgent"]} permissions={["view_account"]}>
      <AccountsListPage
        category="PROPERTY_SALES"
        title="Property Sales Payment Setup"
        description="Configure verified destinations for deposits and completion proceeds. Credentials remain write-only."
        emptyCollectionsCopy="Add a payment account before issuing a payable sales invoice."
        listParams={{ byLandlord: true }}
      />
    </RequireRole>
  );
}
