"use client";

import RequireRole from "@/components/auth/RequireRole";
import AccountsListPage from "@/components/accounts/AccountsListPage";

export default function InsuranceAccountsPage(){return <RequireRole roles={["InsuranceManager"]} permissions={["manage_insurance_payment_config"]}><AccountsListPage category="INSURANCE" title="Insurance payment accounts" description="Create insurer payment destinations, check their setup, and activate them in Silverwood operations." emptyCollectionsCopy="Create an Insurance payment account and complete its required provider or bank details." listParams={{byLandlord:true,size:100}}/></RequireRole>}
