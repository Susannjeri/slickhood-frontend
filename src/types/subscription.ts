

export interface PlanFeature {
  featureKey: string;
  enabled: boolean;
}

export interface PlanQuota {
  metricKey: string;
  limitValue: number;
}

export interface SubscriptionPlan {
  uuid: string;
  code: string;
  displayName: string;
  planCategory: string;
  roleFamily: string;
  billingCycle: string;
  price: number;
  currency: string;
  active: boolean;
  productKey: string;
  purchaseMode: "FREE" | "SELF_SERVICE" | "SALES_MANAGED";
  tierRank: number;
  features: PlanFeature[];
  quotas: PlanQuota[];
}

export interface SubscriptionPlanResponse {
  success: boolean;
  code: string;
  description: string;
  data: SubscriptionPlan[];
  totalPages: number;
  totalElements: number;
  size: number;
}
