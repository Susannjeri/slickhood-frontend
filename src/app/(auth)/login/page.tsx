import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import LoginForm from "@/components/auth/LoginForm";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <AuthSplitLayout>
      <Suspense fallback={<div className="min-h-[24rem]" aria-label="Loading sign in" />}>
        <LoginForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
