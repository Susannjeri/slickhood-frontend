// // app/(auth)/auth_select/reset/page.tsx
// import AuthMethodSelector from "@/components/auth/AuthMethodSelector";

// export default async function ResetPage({
//   searchParams,
// }: {
//   searchParams: Promise<{ [key: string]: string | undefined }>;
// }) {
//   const params = await searchParams;
//   const email = params.email ?? "";
 

//   return (
//     <div className="flex items-center justify-center min-h-screen bg-gray-100">
//       <AuthMethodSelector mode="reset" email={email} />
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