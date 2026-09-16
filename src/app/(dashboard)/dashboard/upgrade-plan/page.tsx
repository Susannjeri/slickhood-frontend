import UpgradePlan from "@/components/subscriptions/upgradeplan";
import RequireRole from "@/components/auth/RequireRole";

const subscriptionOwners = ["Landlord", "EstateManager", "SalesAgent", "ServiceProvider", "AssetPortfolioManager", "Superadmin"];


export default function UpgradePlanPage() {
  return <RequireRole roles={subscriptionOwners}><UpgradePlan /></RequireRole>;
}
