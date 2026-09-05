"use client";

import RequireRole from "@/components/auth/RequireRole";
import AccountsListPage from "@/components/accounts/AccountsListPage";

export default function EstateAccountsPage() {
  return (
    <RequireRole roles={["EstateManager"]} permissions={["view_account"]}>
      <AccountsListPage
        category="ESTATE_MANAGEMENT"
        title="Estate Payment Setup"
        description="Configure verified destinations for service charges and estate operating collections. Credentials remain write-only."
        emptyCollectionsCopy="Add a payment account before issuing payable service-charge invoices."
        listParams={{ byLandlord: true }}
      />
    </RequireRole>
  );
}
