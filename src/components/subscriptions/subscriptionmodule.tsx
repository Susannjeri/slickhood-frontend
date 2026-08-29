"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Plans from "./plans";
import SubscriptionDashboard from "./SubscriptionDashboard";
import { useAuthStore } from "@/store/authStore";


const TABS = [
  { key: "plans", label: "Plans" },
  { key: "subscriptions", label: "Subscriptions" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default function SubscriptionModule() {
  const activeRole = useAuthStore(state => state.activeRole);
  const [activeTab, setActiveTab] = useState<Tab>("plans");

  if (activeRole?.title !== "Superadmin") {
    return <SubscriptionDashboard />;
  }

  return (
    <div className="mt-2">
      {/* Tab bar */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold transition-colors relative",
              activeTab === tab.key
                ? "text-[#08184A]"
                : "text-gray-400 hover:text-[#08184A]"
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4B12] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "plans" && <Plans />}
      {/* {activeTab === "subscriptions" && <SubscriptionPlans />} */}

    </div>
  );
}
