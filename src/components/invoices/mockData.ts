// components/invoices/InvoicesPage.tsx (top of file, or a separate mockData.ts)

import { Invoice } from "@/types/invoice";

// export const MOCK_INVOICES: Invoice[] = [
export const MOCK_INVOICES = [
  {
    id: "INV-2026-0847",
    status: "PAID",
    property: "Sunset Apartments",
    unit: "A-101",
    tenantName: "Sarah Koech",
    tenantEmail: "sarahkoech@email.com",
    date: "February 5, 2026",
    dueDate: "March 5, 2026",
    totalAmount: 2500,
    lineItems: [
      { id: "1", description: "Monthly Rent - Unit A-101", period: "February 2026", amount: 2200 },
      { id: "2", description: "Utilities & Maintenance",   period: "February 2026", amount: 200  },
      { id: "3", description: "Parking Fee",               period: "February 2026", amount: 100  },
    ],
  },
  {
    id: "INV-2026-0846",
    status: "PENDING",
    property: "Lyle Apartments",
    unit: "B-205",
    tenantName: "Billy Jean",
    tenantEmail: "bjean@email.com",
    date: "February 1, 2026",
    dueDate: "March 1, 2026",
    totalAmount: 32000,
    lineItems: [
      { id: "1", description: "Monthly Rent - Unit B-205", period: "February 2026", amount: 30000 },
      { id: "2", description: "Parking Fee",               period: "February 2026", amount: 2000},
    ],
  },
  {
    id: "INV-2026-0845",
    status: "OVERDUE",
    property: "Riverside Complex",
    unit: "A101",
    tenantName: "Leni Juma",
    tenantEmail: "lj@email.com",
    date: "January 15, 2026",
    dueDate: "February 15, 2026",
    totalAmount: 18500,
    lineItems: [
      { id: "1", description: "Monthly Rent - Unit C-312", period: "January 2024", amount: 18500 },
    ],
  },
];