// src/config/sidebarConfig.ts
import { HomeIcon, User, Settings, Rocket, DollarSign, Crown, Building, FileSignature, ClipboardClock, Bell, ReceiptText, Users, Wallet, Landmark, Wrench, LayoutGrid, ChartNoAxesCombined, ShieldCheck, ShieldPlus, ShoppingBasket, BadgeDollarSign, CircleHelp, FileKey2, PiggyBank, Calculator } from "lucide-react"
import { LucideIcon } from "lucide-react"
// import { fa } from "zod/v4/locales"

export interface SidebarLink {
  icon?: LucideIcon
  label: string
  href?: string
  protected: boolean
  permissions: string[]
  description?: string
  roles?: string[]
  excludedRoles?: string[]
  /** Any one of these plan features enables the link for a subscribed primary business role. */
  subscriptionFeatures?: string[]
  subLinks?: SidebarLink[];
}

export interface SidebarSection {
  label: string
  links: SidebarLink[]
}

// Main navigation links (excluding settings)
export const sidebarLinks: SidebarLink[] = [
  {
    icon: HomeIcon,
    label: "Home",
    href: "/dashboard",
    protected: false,
    description: "Get an overview of your activities and key information.",
    permissions: [],
  },
  {
    icon: User,
    label: "Users & Staff",
    href: "/dashboard/users",
    description: "View users and securely invite SlickHood and Silverwood staff.",
    protected: true,
    permissions: ["list_users"],
  },
  {
    icon: ShieldCheck,
    label: "KYC Reviews",
    href: "/dashboard/kyc-review",
    description: "Review submitted customer identity documents and activate verified accounts.",
    protected: true,
    permissions: ["list_users"],
  },
  {
    icon: DollarSign,
    label: "Payments",
    href: "/dashboard/payments",
    description: "View and manage payments and transaction activity.",
    protected: true,
    permissions: ["view_payments"],
  },
  {
    icon: ChartNoAxesCombined,
    label: "Reports",
    href: "/dashboard/reports",
    description: "Operational, financial, property, security and marketplace reporting.",
    protected: false,
    permissions: [],
    subscriptionFeatures: ["ANALYTICS_AND_REPORTS", "SALES_REPORTING"],
  },
  {
    icon: Calculator,
    label: "Tax Assist",
    href: "/dashboard/tax-assist",
    protected: false,
    permissions: [],
    roles: ["Landlord", "PropertyManager", "EstateManager", "SalesAgent", "PropertyAccountant", "WorkspaceAdmin", "Superadmin"],
    description: "Estimate residential rental tax and property-sale CGT before choosing whether to connect to KRA.",
  },
  {
    icon: Wallet,
    label: "Payment Setup",
    href: "/dashboard/accounts",
    protected: true,
    permissions: ["view_account"],
    roles: ["Landlord"],
    subscriptionFeatures: ["LANDLORD_PAYMENT_SETUP", "PER_PROPERTY_PAYMENT_ACCOUNT"],
  },
  {
    icon: Wallet,
    label: "Sales Payment Setup",
    href: "/dashboard/sales/accounts",
    description: "Configure verified destinations for deposits and property-sale proceeds.",
    protected: true,
    permissions: ["view_account"],
    roles: ["SalesAgent"],
    subscriptionFeatures: ["PER_PROPERTY_PAYMENT_ACCOUNT"],
  },
  {
    icon: Wallet,
    label: "Estate Payment Setup",
    href: "/dashboard/estate/accounts",
    description: "Configure verified destinations for service charges and estate operating collections.",
    protected: true,
    permissions: ["view_account"],
    roles: ["EstateManager"],
    subscriptionFeatures: ["PER_PROPERTY_PAYMENT_ACCOUNT"],
  },
  {
    icon: Landmark,
    label: "Recipient Payment Accounts",
    href: "/dashboard/landlord-accounts",
    protected: true,
    permissions: ["view_account"],
    roles: ["Superadmin"],
  },
  // SlickHood Accounts page — hidden from nav for now, not needed yet.
  // Route + RequireRole guard still exist at /dashboard/slickhood-accounts.
  {
    icon: Wallet,
    label: "SlickHood Accounts",
    href: "/dashboard/slickhood-accounts",
    protected: false,
    permissions: [],
    roles: ["Superadmin"],
  },
  {
    icon: LayoutGrid,
    label: "Business Areas",
    href: "/business-areas",
    protected: false,
    permissions: [],
    description: "Switch between SlickHood business areas and role-specific subscriptions.",
  },
  {
    icon: ChartNoAxesCombined,
    label: "My Wealth",
    href: "/dashboard/wealth",
    protected: true,
    permissions: ["view_wealth"],
    description: "Assets, net worth, performance, compliance, goals and projections.",
  },
  {
    icon: ShieldPlus,
    label: "Insurance Hub",
    href: "/dashboard/insurance",
    protected: false,
    permissions: [],
    description: "Quotes, policies, claims and renewals with Silverwood Insurance Agency.",
  },
  {
    icon: ShieldCheck,
    label: "Insurance Operations",
    href: "/dashboard/insurance/operations",
    protected: true,
    permissions: ["review_insurance_applications", "manage_insurance_quotes", "approve_insurance_quotes", "verify_insurance_payments", "issue_insurance_policies", "manage_insurance_claims", "manage_insurance_renewals", "view_insurance_reports", "manage_insurance_catalog", "manage_insurance_payment_config"],
    description: "Applications, quotes, payments, policies, claims and insurer catalogue.",
  },
  {
    icon: PiggyBank,
    label: "Community Funds",
    href: "/dashboard/community-funds",
    protected: true,
    permissions: ["view_community_funds"],
    subscriptionFeatures: ["COMMUNITY_FUNDS"],
    description: "Transparent welfare, project, reserve and emergency funds.",
  },
  {
    icon: Calculator,
    label: "Tax Administration",
    href: "/dashboard/tax-assist/admin",
    protected: false,
    permissions: [],
    roles: ["Superadmin"],
    description: "Govern effective-dated tax rules and review optional KRA connection requests.",
  },
  {
    icon: ShieldCheck,
    label: "Team User Types",
    href: "/dashboard/team-role-definitions",
    description: "Create and govern the customer team roles available in each business area.",
    protected: false,
    permissions: [],
    roles: ["Superadmin"],
  },
  {
    icon: LayoutGrid,
    label: "Property Type Catalogue",
    href: "/dashboard/property-type-catalog",
    description: "Control the unit types available for every property type.",
    protected: false,
    permissions: [],
    roles: ["Superadmin"],
  },
  {
    icon: Building,
    label: "Property Listing Moderation",
    href: "/dashboard/property-listings",
    description: "Review, suspend and reactivate property listings displayed on slickhood.com.",
    protected: true,
    permissions: ["manage_property_listings"],
    roles: ["Superadmin"],
  },


  // { 
  //   icon: Tag,
  //   label: "Property Management",
  //   // href: "/dashboard/property/properties",
  //   protected: true,
  //   permissions: ["create_property","view_property"],
  //   subLinks: [
  //     {
  //       label: "Properties",
  //       href: "/dashboard/property/properties",
  //       permissions: ["create_property","view_property"],
  //       protected: true,can
  //     },
  //     {
  //       label: "Leases",
  //       href:"/dashboard/lease/templates",
  //       permissions:["view_lease_template","create_lease_template", "edit_lease_template", "delete_lease_template"],
  //       protected: true,
  //     }
  //   ]
  // },
  {
    icon: Building,
    label: "Properties",
    permissions: ["create_property", "view_property"],
    excludedRoles: ["Tenant", "Buyer", "Homeowner"],
    subscriptionFeatures: ["PROPERTY_AND_UNIT_MANAGEMENT", "ESTATE_AND_HOMEOWNER_MANAGEMENT", "PROPERTY_SALES"],
    protected: true,
    subLinks: [
      {
        label: "All Properties",
        href: "/dashboard/property/properties",
        permissions: ["create_property", "view_property"],
        subscriptionFeatures: ["PROPERTY_AND_UNIT_MANAGEMENT", "ESTATE_AND_HOMEOWNER_MANAGEMENT", "PROPERTY_SALES"],
        protected: true,
      },
      {
        label: "Sale Units",
        href: "/dashboard/property/sale-units",
        permissions: ["view_sale_pipeline"],
        subscriptionFeatures: ["PROPERTY_SALES"],
        protected: true,
      },
      {
        label: "Homeowners",
        href: "/dashboard/homeowners",
        permissions: ["view_estate"],
        subscriptionFeatures: ["ESTATE_AND_HOMEOWNER_MANAGEMENT"],
        protected: true,
      },
      {
        label: "Rentals",
        href: "/dashboard/property/rentals",
        permissions: ["create_property", "view_property"],
        subscriptionFeatures: ["PROPERTY_AND_UNIT_MANAGEMENT"],
        protected: true,
      },
      {
        label: "Create Unit",
        href: "/dashboard/unit/create",
        permissions: ["create_unit"],
        subscriptionFeatures: ["PROPERTY_AND_UNIT_MANAGEMENT", "ESTATE_AND_HOMEOWNER_MANAGEMENT", "PROPERTY_SALES"],
        protected: true,
      },
      {
        label: "Listing Enquiries",
        href: "/dashboard/property-listing-inquiries",
        permissions: ["advertise_unit"],
        subscriptionFeatures: ["PROPERTY_LISTINGS"],
        protected: true,
      }
    ],
  },
  {
    icon: FileSignature,
    label: "Leases",
    permissions: ["view_active_lease", "view_lease_template", "create_lease_template", "edit_lease_template", "delete_lease_template"],
    subscriptionFeatures: ["LEASE_MANAGEMENT"],
    protected: true,
    subLinks: [
      { label: "Lease operations", href: "/dashboard/lease/operations", permissions: ["view_active_lease"], protected: true },
      { label: "Lease templates", href: "/dashboard/lease/templates", permissions: ["view_lease_template"], excludedRoles: ["Tenant"], protected: true },
    ],
  },
  {
    icon: FileSignature,
    label: "Documents & Notices",
    href: "/dashboard/documents",
    permissions: ["view_lease_document"],
    protected: true,
    description: "Create, issue, acknowledge, sign, and review governed property documents.",
  },
  {
    icon: Building,
    label: "Estate Management",
    href: "/dashboard/estate",
    permissions: ["view_estate"],
    roles: ["EstateManager", "EstateOperationsManager", "WorkspaceAdmin", "WorkspaceViewer", "PropertyAccountant", "SecuritySupervisor"],
    subscriptionFeatures: ["ESTATE_MANAGEMENT", "ESTATE_AND_HOMEOWNER_MANAGEMENT"],
    protected: true,
    description: "Homeowners, ownership history, service charges and estate operations.",
  },
  {
    icon: Building,
    label: "My Home",
    href: "/dashboard/estate",
    permissions: ["view_estate"],
    roles: ["Homeowner"],
    protected: true,
    description: "View owned homes, service charges, balances and estate documents.",
  },
  {
    icon: Landmark,
    label: "Property Sale Management",
    href: "/dashboard/sales",
    permissions: ["view_sale_pipeline"],
    roles: ["SalesAgent", "SalesCoordinator", "ListingAgent"],
    subscriptionFeatures: ["PROPERTY_SALES", "BUYER_PIPELINE"],
    protected: true,
    description: "Buyer journeys, viewings, offers, due diligence, completion and handover.",
  },
  {
    icon: Landmark,
    label: "My Property Purchase",
    href: "/dashboard/sales",
    permissions: ["view_sale_pipeline"],
    roles: ["Buyer"],
    protected: true,
    description: "Review offers, sale documents, milestones and property handover.",
  },
  {
    icon: ClipboardClock,
    label: "Audit Logs",
    href: "/dashboard/auditlogs",
    protected: true,
    permissions: ["view_audit_logs"],
  },
  {
    icon: Bell,
    label: "Notifications",
    href: "/dashboard/notifications",
    protected: true,
    permissions: ["view_notifications", "view_my_notifications"],
  },
  {
    icon: CircleHelp,
    label: "Help Desk",
    href: "/dashboard/helpdesk",
    protected: false,
    permissions: [],
    description: "Ask Slickhood Help, browse guidance, and contact human support.",
  },
  {
    icon: FileKey2,
    label: "Privacy Centre",
    href: "/dashboard/privacy",
    protected: false,
    permissions: [],
    description: "Download your data and track access or erasure requests.",
  },
  {
    icon: ReceiptText,
    label: "Invoices",
    href: "/dashboard/invoices",
    protected: false,
    permissions: ["view_invoice_list"],
  },

  {
    icon: Crown,
    label: "Subscriptions",
    href: "/dashboard/subscriptions",
    protected: false,
    permissions: [],
    roles: ["Landlord", "EstateManager", "SalesAgent", "ServiceProvider", "Affiliate", "AssetPortfolioManager", "Superadmin"],
    description: "Manage your active subscription, renewal and billing history.",
  },
  {
    icon: Rocket,
    label: "Upgrade Plan",
    href: "/dashboard/upgrade-plan",
    protected: false,
    permissions: [],
    roles: ["Landlord", "EstateManager", "SalesAgent", "ServiceProvider", "Affiliate", "AssetPortfolioManager"],
    description: "Explore plan options and upgrade your subscription.",
  },
  {
    icon: Users,
    label: "Team & Access",
    href: "/dashboard/team-access",
    protected: false,
    permissions: [],
    roles: ["Landlord", "EstateManager", "SalesAgent", "WorkspaceAdmin"],
    subscriptionFeatures: ["MULTIPLE_USER_ROLES"],
    description: "Invite team members, assign secure roles and control their workspace scope.",
  },
  {
    icon: Users,
    label: "Visitors",
    href: "/dashboard/visitors",
    protected: true,
    description: "Register, view, and manage visitors to your property.",
    permissions: ["view_visitor_list"],
    subscriptionFeatures: ["VISITOR_MANAGEMENT"],
  },
  {
    icon: Users,
    label: "Visitor Management",
    href: "/dashboard/visitor-management",
    protected: true,
    description: "Manage visitor check-ins, check-outs, and status updates.",
    permissions: ["update_visitor_status"],
    subscriptionFeatures: ["VISITOR_MANAGEMENT"],
  },
  {
    icon: ShieldCheck,
    label: "Smart Gates",
    href: "/dashboard/smart-gates",
    protected: true,
    description: "Gate controllers, access decisions, and security audit trail.",
    permissions: ["view_gate_events", "manage_gate_devices"],
    subscriptionFeatures: ["GATE_MANAGEMENT_INCLUDED_UNITS", "GATE_MANAGEMENT"],
  },

  {
    icon: Wrench,
    label: "Service Management",
    href: "/dashboard/service-management",
    description:
      "Manage service categories and services available to service providers.",
    permissions: ["manage_sp_categories"],
    protected: true,
  },

  {
    icon: Wrench,
    label: "Marketplace",
    description: "Browse services and shop Soko in one place.",
    permissions: [],
    protected: true,
    subLinks: [
      { label: "Services", href: "/dashboard/marketplace", permissions: ["view_sp_service"], protected: true },
      { label: "Soko", href: "/dashboard/soko", permissions: [], protected: true },
    ],
  },
  {
    icon: BadgeDollarSign,
    label: "Affiliate",
    href: "/dashboard/affiliate",
    description: "Share referral links, track conversions and manage commissions and payouts.",
    permissions: ["view_invite_list"],
    roles: ["Affiliate"],
    protected: true,
  },
  {
    icon: BadgeDollarSign,
    label: "Affiliate Management",
    href: "/dashboard/affiliate-management",
    description: "Review affiliate commissions and process payout requests.",
    permissions: [],
    roles: ["Superadmin"],
    protected: true,
  },
  {
    icon: ShoppingBasket,
    label: "Soko Management",
    href: "/dashboard/soko-management",
    description: "Approve shops, moderate listings and oversee marketplace operations.",
    permissions: [],
    roles: ["Superadmin"],
    protected: true,
  },
  {
    icon: Landmark,
    label: "Wealth Management",
    href: "/dashboard/wealth-management",
    description: "Maintain the wealth catalogue and monitor privacy-safe platform health.",
    permissions: [],
    roles: ["Superadmin"],
    protected: true,
  },
  {
    icon: Wrench,
    label: "My Services",
    href: "/dashboard/services",
    description: "Manage the services you offer, pricing, and required service information.",
    permissions: ["view_sp_category_list"],
    roles: ["ServiceProvider"],
    protected: true,
  },
  {
    icon: Wallet,
    label: "Merchant Accounts",
    href: "/dashboard/merchant-accounts",
    description: "Configure payment accounts for Services and Soko settlements.",
    permissions: ["view_account"],
    roles: ["ServiceProvider"],
    protected: true,
  }
]

// Navigation follows the way users work instead of the order in which
// modules were developed. Keep route and permission definitions above as
// the single source of truth; these sections only control presentation.
const sectionDefinitions = [
  { label: "Overview", links: ["Home", "Business Areas", "My Wealth"] },
  { label: "Property & Leasing", links: ["Properties", "Leases", "Documents & Notices", "Estate Management", "My Home", "Property Sale Management", "My Property Purchase", "Community Funds"] },
  { label: "Money", links: ["Payment Setup", "Estate Payment Setup", "Sales Payment Setup", "Payments", "Invoices", "Tax Assist", "Reports", "Insurance Hub"] },
  { label: "People & Access", links: ["Team & Access", "Visitors", "Visitor Management", "Smart Gates"] },
  { label: "Services & Shopping", links: ["Marketplace", "My Services", "Merchant Accounts", "Affiliate"] },
  { label: "Support", links: ["Notifications", "Help Desk", "Privacy Centre", "Subscriptions", "Upgrade Plan"] },
  { label: "Administration", links: ["Users & Staff", "KYC Reviews", "Team User Types", "Property Type Catalogue", "Property Listing Moderation", "Recipient Payment Accounts", "SlickHood Accounts", "Tax Administration", "Audit Logs", "Insurance Operations", "Service Management", "Soko Management", "Wealth Management", "Affiliate Management"] },
] as const

const sidebarLinkByLabel = new Map(sidebarLinks.map((link) => [link.label, link]))

export const sidebarSections: SidebarSection[] = sectionDefinitions.map((section) => ({
  label: section.label,
  links: section.links
    .map((label) => sidebarLinkByLabel.get(label))
    .filter((link): link is SidebarLink => Boolean(link)),
}))

// Settings links for footer
export const settingsLinks: SidebarLink[] = [
  {
    icon: Settings,
    label: "Settings",
    protected: true,
    permissions: ["manage_settings", "view_param", "view_config", "edit_config", "view_all_params"],
    subLinks: [
      {
        label: "General Settings",
        href: "/dashboard/user",
        permissions: ["manage_settings"],
        protected: true,
      },
      {
        label: "Global Config",
        href: "/dashboard/configs",
        permissions: ["view_config"],
        protected: true,
      },
      {
        label: "User Parameters",
        href: "/dashboard/view",
        permissions: ["view_all_params"],
        protected: true,
      }
    ],
  },
]
