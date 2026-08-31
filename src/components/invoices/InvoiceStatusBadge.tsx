// // components/invoices/InvoiceStatusBadge.tsx
// import { InvoiceStatus } from "@/types/invoice";

// const statusStyles: Record<InvoiceStatus, string> = {
//   PAID:    "bg-green-100  text-green-700",
//   PENDING: "bg-amber-100  text-amber-700",
//   OVERDUE: "bg-red-100    text-red-700",
// };

// export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
//   return (
//     <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyles[status]}`}>
//       {status}
//     </span>
//   );
// }
// components/invoices/InvoiceStatusBadge.tsx

import { InvoiceStatus } from "@/types/invoice";

const statusStyles: Record<InvoiceStatus, string> = {
  PAID:   "bg-green-100 text-green-700",
  "PARTIALLY PAID": "bg-blue-100 text-blue-700",
  OVERDUE: "bg-red-100 text-red-700",
  UNPAID: "bg-amber-100 text-amber-700",
};

// When the card is selected (orange background), default badge colors
// don't have enough contrast. We flip to white-tinted versions instead.
const selectedStatusStyles: Record<InvoiceStatus, string> = {
  PAID:   "bg-white/20 text-white",
  "PARTIALLY PAID": "bg-white/20 text-white",
  OVERDUE: "bg-white/20 text-white",
  UNPAID: "bg-white/20 text-white",
};

interface Props {
  status: InvoiceStatus;
  isSelected?: boolean;
}

export function InvoiceStatusBadge({ status, isSelected = false }: Props) {
  const styles = isSelected ? selectedStatusStyles[status] : statusStyles[status];
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${styles}`}>
      {status}
    </span>
  );
}
