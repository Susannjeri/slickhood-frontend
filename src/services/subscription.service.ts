import { API } from "@/lib/api";
import { Account } from "@/types/account";
import { PlanFeature, PlanQuota } from "@/types/subscription";

export interface SubscriptionPlanWrite {
  code: string;
  displayName: string;
  planCategory: string;
  roleFamily: string;
  billingCycle: string;
  price: number;
  currency: string;
  features: PlanFeature[];
  quotas: PlanQuota[];
}

export interface SubscriptionCheckout {
  invoiceRef: string;
  currency: string;
  amount: number;
  planCode: string;
  role: string;
}

export interface CurrentSubscription {
  uuid: string;
  role: string;
  planCode: string;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "SUSPENDED" | "CANCELLED";
  startAt: string;
  endAt: string | null;
  autoRenew: boolean;
  planDetails: import("@/types/subscription").SubscriptionPlan;
}

export interface SubscriptionOverview {
  subscription: CurrentSubscription | null;
  propertiesUsed: number;
  unitsUsed: number;
  cancellationScheduled: boolean;
  scheduledPlanCode: string | null;
}

export interface SubscriptionBillingItem {
  invoiceRef: string;
  createdOn: string;
  planCode: string;
  currency: string;
  amount: number;
  pendingAmount: number;
  status: "SUCCESSFUL" | "PROCESSING" | "PENDING";
}

export const subscriptionRoleForTitle = (title?: string | null) => {
  const normalized = title?.replaceAll(" ", "").toLowerCase();
  if (normalized === "landlord") return "LANDLORD";
  if (normalized === "estatemanager") return "ESTATE_MANAGER";
  if (normalized === "salesagent") return "SALES_AGENT";
  if (normalized === "serviceprovider") return "SERVICE_PROVIDER";
  if (normalized === "affiliate") return "AFFILIATE";
  if (normalized === "assetportfoliomanager") return "ASSET_PORTFOLIO_MANAGER";
  return null;
};

export const getSubscriptionPlans = (
  token: string,
  page = 0,
  size = 10,
  category = ""
) => {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdOn,desc",
  });

  if (category.trim()) {
    params.append("category", category.trim().toUpperCase());
  }

  return API.get(`/plans?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const getPlanByCode = (token: string, code: string) => {
  return API.get(`/plans/${code.trim().toUpperCase()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};


export const createSubscriptionPlan = (
  token: string,
  payload: SubscriptionPlanWrite
) => {
  return API.post("/plans", payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const updateSubscriptionPlan = (
  token: string,
  code: string,
  payload: SubscriptionPlanWrite
) => {
  return API.put(`/plans/${code.trim().toUpperCase()}`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};


export const updatePlanStatus = (
  token: string,
  code: string,
  active: boolean
) => {
  return API.patch(
    `/plans/${code.trim().toUpperCase()}/status`,
    { active },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

export const getCurrentSubscription = (token: string, role?: string | null) => {
  return API.get("/subscription/current", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: role ? { role } : undefined,
  });
};

export const getSubscriptionCatalog = (token: string, role: string) =>
  API.get("/subscription/plans", {
    headers: { Authorization: `Bearer ${token}` },
    params: { role: role.trim().toUpperCase() },
  });

export const subscribeToPlan = (
  token: string,
  payload: {
    role: string;
    planCode: string;
    paymentAccountId: number | null;
  }
) => {
  return API.post("/subscription/subscribe", payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const getSubscriptionPaymentAccounts = (token: string) =>
  API.get<{ data: Account[] }>("/subscription/payment-accounts", {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getSubscriptionOverview = (token: string, role: string) =>
  API.get<{ data: SubscriptionOverview[] }>("/subscription/overview", {
    headers: { Authorization: `Bearer ${token}` },
    params: { role },
  });

export const getSubscriptionBillingHistory = (token: string, page = 0, size = 20) =>
  API.get<{ data: SubscriptionBillingItem[] }>("/subscription/billing-history", {
    headers: { Authorization: `Bearer ${token}` },
    params: { page, size, sort: "createdOn,desc" },
  });

export const updateSubscriptionAutoRenew = (token: string, role: string, enabled: boolean) =>
  API.post("/subscription/auto-renew", { enabled }, {
    headers: { Authorization: `Bearer ${token}` },
    params: { role },
  });

export const cancelSubscription = (token: string, role: string, reason: string) =>
  API.post("/subscription/cancel", { reason }, {
    headers: { Authorization: `Bearer ${token}` },
    params: { role },
  });

export const restoreSubscriptionCancellation = (token: string, role: string) =>
  API.post("/subscription/cancel/restore", {}, {
    headers: { Authorization: `Bearer ${token}` },
    params: { role },
  });

export const renewSubscription = (token: string, role: string, paymentAccountId: number | null) =>
  API.post("/subscription/renew", { paymentAccountId }, {
    headers: { Authorization: `Bearer ${token}` },
    params: { role },
  });

export const scheduleSubscriptionPlanChange = (token: string, role: string, planCode: string) =>
  API.post("/subscription/change-plan", { planCode }, {
    headers: { Authorization: `Bearer ${token}` },
    params: { role },
  });

export const revokeSubscriptionPlanChange = (token: string, role: string) =>
  API.post("/subscription/change-plan/revoke", {}, {
    headers: { Authorization: `Bearer ${token}` },
    params: { role },
  });

export const getSubscriptionTrialPolicy = (token: string) =>
  API.get<{ data: { durationDays: number }[] }>("/subscription/trial-policy", {
    headers: { Authorization: `Bearer ${token}` },
  });

export const startSubscriptionTrial = (token: string, role: string, planCode: string) =>
  API.post("/subscription/trial", { role, planCode }, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const requestSubscriptionSalesContact = (
  token: string,
  planCode: string,
  message: string
) => API.post("/subscription/contact-sales", { planCode, message }, {
  headers: { Authorization: `Bearer ${token}` },
});

export const initSubscriptionPayment = (
  token: string,
  invoiceRef: string,
  accountId: number,
  paymentChannel: string,
  phoneNumber?: string
) => API.get("/payment/init", {
  headers: { Authorization: `Bearer ${token}` },
  params: { invoiceRef, accountId, paymentChannel, ...(phoneNumber ? { phoneNumber } : {}) },
});
