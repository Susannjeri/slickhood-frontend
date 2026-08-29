// // app/(auth)/reset/email/page.tsx
// import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

// export default async function ResetEmailPage({
//   searchParams,
// }: {
//   searchParams: Promise<{ [key: string]: string | undefined }>;
// }) {
//   const params = await searchParams;
//   const email = params.email ?? "";

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
//       <ResetPasswordForm method="email" email={email} />
//     </div>
//   );
// }
import React from 'react'

function page() {
  return (
    <div>page</div>
  )
}

export default page