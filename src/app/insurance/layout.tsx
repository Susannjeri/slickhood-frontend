import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner Insurance Hub | SlickHood",
  description:
    "Request insurance quotations from approved insurers through SlickHood's secure partner insurance journey.",
};

export default function InsuranceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
