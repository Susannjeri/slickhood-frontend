import SubscriptionModule from "@/components/subscriptions/subscriptionmodule";
import RequireRole from "@/components/auth/RequireRole";

const subscriptionOwners = ["Landlord", "EstateManager", "SalesAgent", "ServiceProvider", "AssetPortfolioManager", "Superadmin"];

export default function Page() {
  return <RequireRole roles={subscriptionOwners}><SubscriptionModule /></RequireRole>;
}
