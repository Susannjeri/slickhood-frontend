// src/config/sidebarConfig.ts
import { HomeIcon, User, Settings, Rocket, DollarSign, Crown, Building, FileSignature, ClipboardClock, Bell, ReceiptText, Users, Wallet, Landmark, Wrench, LayoutGrid, ChartNoAxesCombined, ShieldCheck, ShieldPlus, ShoppingBasket, BadgeDollarSign, CircleHelp, FileKey2, PiggyBank } from "lucide-react"
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
  subLinks?: SidebarLink[];
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
    label: "Users",
    href: "/dashboard/users",
    description: "View and manage users, accounts, and access.",
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
  },
  {
    icon: Wallet,
    label: "Accounts",
    href: "/dashboard/accounts",
    protected: true,
    permissions: ["view_account"],
    roles: ["Landlord"],
  },
  {
    icon: Landmark,
    label: "Landlord Accounts",
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
    label: "Wealth",
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
    icon: PiggyBank,
    label: "Community Funds",
    href: "/dashboard/community-funds",
    protected: true,
    permissions: ["view_community_funds"],
    description: "Transparent welfare, project, reserve and emergency funds.",
  },
  {
    icon: Crown,
    label: "Admin Panel",
    href: "/dashboard/users",
    description: "Manage administrative settings, controls, and system operations.",
    protected: true,
    permissions: ["admin_access"],
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
    protected: true,
    subLinks: [
      {
        label: "All Properties",
        href: "/dashboard/property/properties",
        permissions: ["create_property", "view_property"],
        protected: true,
      },
      {
        label: "Sale Units",
        href: "/dashboard/property/sale-units",
        permissions: ["create_property", "view_property"],
        protected: true,
      },
      {
        label: "Homeowners",
        href: "/dashboard/homeowners",
        permissions: ["create_property", "view_property"],
        protected: true,
      },
      {
        label: "Rentals",
        href: "/dashboard/property/rentals",
        permissions: ["create_property", "view_property"],
        protected: true,
      },
      {
        label: "Create Unit",
        href: "/dashboard/unit/create",
        permissions: ["create_unit"],
        protected: true,
      }
    ],
  },
  {
    icon: FileSignature,
    label: "Leases",
    href: "/dashboard/lease/templates",
    permissions: ["view_lease_template", "create_lease_template", "edit_lease_template", "delete_lease_template"],
    protected: true,
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
    label: "Estate & Homeowners",
    href: "/dashboard/estate",
    permissions: ["view_estate"],
    protected: true,
  },
  {
    icon: Landmark,
    label: "Sales Pipeline",
    href: "/dashboard/sales",
    permissions: ["view_sale_pipeline"],
    protected: true,
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
    permissions: ["view_notifications"],
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
    description: "Manage your active subscription, renewal and billing history.",
  },
  {
    icon: Rocket,
    label: "Upgrade Plan",
    href: "/dashboard/upgrade-plan",
    protected: false,
    permissions: [],
    description: "Explore plan options and upgrade your subscription.",
  },
  {
    icon: Users,
    label: "Visitors",
    href: "/dashboard/visitors",
    protected: true,
    description: "Register, view, and manage visitors to your property.",
    permissions: ["view_visitor_list"],
  },
  {
    icon: Users,
    label: "Visitor Management",
    href: "/dashboard/visitor-management",
    protected: true,
    description: "Manage visitor check-ins, check-outs, and status updates.",
    permissions: ["update_visitor_status"],
  },
  {
    icon: ShieldCheck,
    label: "Smart Gates",
    href: "/dashboard/smart-gates",
    protected: true,
    description: "Gate controllers, access decisions, and security audit trail.",
    permissions: ["view_gate_events", "manage_gate_devices"],
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
    href: "/dashboard/marketplace",
    description: "Find verified providers, book services, and track service jobs.",
    permissions: ["view_sp_service"],
    protected: true,
  },
  {
    icon: ShoppingBasket,
    label: "Soko",
    href: "/dashboard/soko",
    description: "Find nearby grocery shops, order essentials, and track secure deliveries.",
    permissions: [],
    protected: true,
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
        label: "Payment Settings",
        href: "/dashboard/params",
        permissions: ["view_param"],
        protected: true,
      },
      {
        label: "Global Config",
        href: "/dashboard/configs",
        permissions: ["view_config", "edit_config"],
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
