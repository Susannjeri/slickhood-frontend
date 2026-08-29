"use client";

import { useState } from "react";
import { Layers, Clock, Inbox } from "lucide-react";
import ServiceCategories from "./service-categories";
import ServiceApproval from "./serviceapproval";


type Tab = "categories" | "approvals";

const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: "categories", label: "Service categories", icon: Layers },
  { id: "approvals", label: "Service approvals", icon: Clock },
];

export default function ServiceManagement() {
  const [activeTab, setActiveTab] = useState<Tab>("categories");
  // State for dynamic pending-approvals count
  const [approvalsCount, setApprovalsCount] = useState<number>(0);

  return (
    <div className="px-3 py-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Tabs Header */}
        <div
          role="tablist"
          aria-label="Service management sections"
          className="flex gap-1 overflow-x-auto border-b border-gray-200 px-4 pt-3 sm:px-6"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            const count = tab.id === "approvals" ? approvalsCount : null;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`group relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-md px-3 pb-3 pt-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#08184A]/40 ${
                  isActive ? "text-[#08184A]" : "text-gray-500 hover:text-[#08184A]"
                }`}
              >
                <Icon
                  size={16}
                  strokeWidth={2}
                  className={isActive ? "text-[#FF4B12]" : "text-gray-400 group-hover:text-gray-500"}
                />
                {tab.label}

                {count !== null && count > 0 && (
                  <span
                    className={`ml-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
                      isActive ? "bg-[#FF4B12]/10 text-[#FF4B12]" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {count}
                  </span>
                )}

                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#FF4B12]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6" role="tabpanel">
          {activeTab === "categories" && (
            <>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#020B2D]">
                  Service categories
                </h2>
                <p className="mt-0 text-xs text-gray-500">
                  Define and manage the categories that service providers can use when registering their services.
                </p>
              </div>

              <ServiceCategories />
            </>
          )}

          {activeTab === "approvals" && (
            <>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#020B2D]">
                  Service approvals
                </h2>
                <p className="mt-0 text-xs text-gray-500">
                  Review submitted services, verify their supporting information, and approve or reject before listing.
                </p>
              </div>

              {/* Render ServiceApproval and pass count handler */}
              <ServiceApproval onCountChange={setApprovalsCount} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}