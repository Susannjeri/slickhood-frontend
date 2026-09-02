"use client";

import RequireRole from "@/components/auth/RequireRole";
import AccountsListPage from "@/components/accounts/AccountsListPage";

export default function InsuranceAccountsPage(){return <RequireRole roles={["InsuranceManager"]} permissions={["manage_insurance_payment_config"]}><AccountsListPage category="INSURANCE" title="Insurance payment accounts" description="Create insurer payment destinations for verification before activating them in Silverwood operations." emptyCollectionsCopy="Create an Insurance payment account, then ask the SlickHood system owner to verify it." listParams={{byLandlord:true,size:100}}/></RequireRole>}
