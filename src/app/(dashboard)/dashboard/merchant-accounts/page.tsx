"use client";

import RequireRole from "@/components/auth/RequireRole";
import AccountsListPage from "@/components/accounts/AccountsListPage";

export default function MerchantAccountsPage(){return <RequireRole roles={["ServiceProvider"]} permissions={["view_account"]}><AccountsListPage category="MERCHANT" title="Merchant Payment Accounts" description="Configure verified payment rails for Services and Soko settlements" emptyCollectionsCopy="Create a merchant account so customer payments can be routed to you." listParams={{byLandlord:true}}/></RequireRole>}
