"use client";
import AccountsListPage from "@/components/accounts/AccountsListPage";
export default function CommunityFundAccountsPage(){return <AccountsListPage category="COMMUNITY_FUND" title="Community Fund Accounts" description="Create and verify a ring-fenced collection account for welfare or project funds." emptyCollectionsCopy="Add a Community Fund account before opening a fund." listParams={{byLandlord:true,size:100}}/>}
