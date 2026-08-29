import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Toaster position="top-center" />
      <AuthSplitLayout backLink={{ href: "/login", label: "Back to Sign In" }}>
        {children}
      </AuthSplitLayout>
    </>
  );
}
