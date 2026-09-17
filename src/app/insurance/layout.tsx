import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Silverwood Insurance Agency | Request a Quote" },
  description:
    "Request and compare adviser-reviewed insurance quotations coordinated by Silverwood Insurance Agency.",
};

export default function InsuranceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
