"use client";

import Plans from "./plans";
import SubscriptionDashboard from "./SubscriptionDashboard";
import { useAuthStore } from "@/store/authStore";

export default function SubscriptionModule() {
  const activeRole = useAuthStore(state => state.activeRole);
  return activeRole?.title === "Superadmin" ? <Plans /> : <SubscriptionDashboard />;
}
