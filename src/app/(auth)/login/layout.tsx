import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-center" />
    </>
  );
}
