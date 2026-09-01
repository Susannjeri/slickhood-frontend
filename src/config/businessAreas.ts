export type BusinessAreaId = "property-management" | "property-sales" | "estate-management" | "service-marketplace" | "soko" | "affiliate" | "asset-portfolio";

export interface BusinessArea {
  id: BusinessAreaId;
  title: string;
  eyebrow: string;
  description: string;
  roleTitles: string[];
  registrationRoleName: string;
  subscriptionRole: "LANDLORD" | "ESTATE_MANAGER" | "SALES_AGENT" | "SERVICE_PROVIDER" | "AFFILIATE" | "ASSET_PORTFOLIO_MANAGER";
  subscriptionProduct: "LANDLORD" | "ESTATE_MANAGEMENT" | "PROPERTY_SALES" | "SERVICES" | "SOKO" | "AFFILIATE" | "MY_WEALTH";
  workspaceHref: string;
  highlights: string[];
}

export const businessAreas: BusinessArea[] = [
  {
    id: "property-management",
    title: "Rental Management",
    eyebrow: "SlickHood PMS",
    description: "Manage rental properties, units, tenants, leases, payments, gates, listings and reporting.",
    roleTitles: ["landlord"],
    registrationRoleName: "Landlord",
    subscriptionRole: "LANDLORD",
    subscriptionProduct: "LANDLORD",
    workspaceHref: "/dashboard",
    highlights: ["Rentals and tenant operations", "Rent collection and notices", "Payments, gates and listings"],
  },
  {
    id: "property-sales",
    title: "Property Sale Management",
    eyebrow: "SlickHood Property Sales",
    description: "Manage buyers, viewings, offers, due diligence, agreements, completion and ownership handover.",
    roleTitles: ["salesagent"],
    registrationRoleName: "SalesAgent",
    subscriptionRole: "SALES_AGENT",
    subscriptionProduct: "PROPERTY_SALES",
    workspaceHref: "/dashboard/sales",
    highlights: ["Buyer and offer pipeline", "Due diligence and sale documents", "Completion and handover"],
  },
  {
    id: "estate-management",
    title: "Estate Management",
    eyebrow: "SlickHood Estates",
    description: "Manage homeowners, ownership history, service charges, community operations, gates and common areas.",
    roleTitles: ["estatemanager"],
    registrationRoleName: "EstateManager",
    subscriptionRole: "ESTATE_MANAGER",
    subscriptionProduct: "ESTATE_MANAGEMENT",
    workspaceHref: "/dashboard/estate",
    highlights: ["Homeowner onboarding", "Service-charge operations", "Visitors, notices and common areas"],
  },
  {
    id: "service-marketplace",
    title: "Services Marketplace",
    eyebrow: "Services marketplace",
    description: "List trusted services, reach landlords and tenants, manage pricing, bookings and reputation.",
    roleTitles: ["serviceprovider"],
    registrationRoleName: "ServiceProvider",
    subscriptionRole: "SERVICE_PROVIDER",
    subscriptionProduct: "SERVICES",
    workspaceHref: "/dashboard/services",
    highlights: ["Service listings", "Provider verification", "Bookings and customer access"],
  },
  {
    id: "soko",
    title: "Soko",
    eyebrow: "Local shops and delivery",
    description: "Run a nearby grocery shop, manage products, orders, preferred riders, fulfilment and delivery codes.",
    roleTitles: ["serviceprovider"],
    registrationRoleName: "ServiceProvider",
    subscriptionRole: "SERVICE_PROVIDER",
    subscriptionProduct: "SOKO",
    workspaceHref: "/dashboard/soko",
    highlights: ["Shop and product catalogue", "Orders and preferred riders", "Secure delivery-code handover"],
  },
  {
    id: "affiliate",
    title: "Affiliate Programme",
    eyebrow: "Grow SlickHood",
    description: "Refer landlords and service providers, track qualified conversions, commissions and payouts.",
    roleTitles: ["affiliate"],
    registrationRoleName: "Affiliate",
    subscriptionRole: "AFFILIATE",
    subscriptionProduct: "AFFILIATE",
    workspaceHref: "/dashboard/affiliate",
    highlights: ["Campaign referral links", "Conversion tracking", "Commission and payout visibility"],
  },
  {
    id: "asset-portfolio",
    title: "My Wealth",
    eyebrow: "Your financial command centre",
    description: "Know what you own, what it is worth, what it earns, what it costs and what needs attention.",
    roleTitles: ["assetportfoliomanager"],
    registrationRoleName: "AssetPortfolioManager",
    subscriptionRole: "ASSET_PORTFOLIO_MANAGER",
    subscriptionProduct: "MY_WEALTH",
    workspaceHref: "/dashboard/wealth",
    highlights: ["Net worth and asset performance", "Debt, cash flow and projections", "Compliance reminders and digital vault"],
  },
];

export const normalizedRoleTitle = (value?: string | null) =>
  value?.replaceAll(" ", "").replaceAll("_", "").toLowerCase() ?? "";

const roleDisplayNames: Record<string, string> = {
  assetportfoliomanager: "My Wealth",
  estatemanager: "Estate Management",
  salesagent: "Property Sale Management",
};

export const roleDisplayName = (value?: string | null) =>
  roleDisplayNames[normalizedRoleTitle(value)] ?? value ?? "";

export const businessAreaForRoleTitle = (value?: string | null) => {
  const normalized = normalizedRoleTitle(value);
  return businessAreas.find(area => area.roleTitles.includes(normalized));
};

export const workspaceHrefForRole = (value?: string | null) => {
  const normalized = normalizedRoleTitle(value);
  const businessArea = businessAreaForRoleTitle(value);
  if (businessArea) return businessArea.workspaceHref;

  if (["buyer", "salescoordinator", "listingagent"].includes(normalized)) return "/dashboard/sales";
  if (["homeowner", "estateoperationsmanager"].includes(normalized)) return "/dashboard/estate";
  if (normalized === "tenant") return "/dashboard/lease/operations";
  return "/dashboard";
};
