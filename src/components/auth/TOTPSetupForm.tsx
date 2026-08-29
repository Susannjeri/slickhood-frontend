// // components/TOTPSetupForm.tsx

// 'use client';

// import React, { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { useForm } from 'react-hook-form';
// import { email, z } from 'zod';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { useAuth } from '@/hooks/useAuth';
// import { useAuthStore } from '@/store/authStore';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
// import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

// // Zod schema
// const formSchema = z.object({
//   totpCode: z.string().length(6, {
//     message: 'Your TOTP code must be 6 digits.',
//   }),
// });

// const TOTPSetupForm: React.FC = () => {
//   const { fetchQRCode, verifyTotpCode } = useAuth();
//   const { resetRegistrationData, email } = useAuthStore();
//   const router = useRouter();

//   const [qrCodeData, setQrCodeData] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [statusMessage, setStatusMessage] = useState<string | null>(null);
//   const [isSuccess, setIsSuccess] = useState<boolean>(false);

//   const form = useForm<z.infer<typeof formSchema>>({
//     resolver: zodResolver(formSchema),
//     defaultValues: { totpCode: '' },
//   });

//   useEffect(() => {
//     const getQRCode = async () => {
//       setLoading(true);
//       try {
//         const response = await fetchQRCode();
//         if (response.success) {
//           setQrCodeData(response.qrcode);
//         } else {
//           setStatusMessage(response.message);
//         }
//       } catch (err) {
//         setStatusMessage('Failed to fetch QR code!!!.');
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (useAuthStore.getState().email || "primestartschool@gmail.com") {
//       getQRCode();
//     } else {
//       setStatusMessage("Email not found. Please start registration from the beginning.");
//       setLoading(false);
//     }
//   }, []);

//   const onSubmit = async (values: z.infer<typeof formSchema>) => {
//     setLoading(true);
//     setStatusMessage(null);
//     setIsSuccess(false);

//     const response = await verifyTotpCode(values.totpCode, email || "", "google");
//     setLoading(false);

//     if (response.success) {
//       setStatusMessage("Onboarding Successful! Redirecting to dashboard...");
//       setIsSuccess(true);
//       setTimeout(() => {
//         router.push('/dashboard');
//       }, 2000);
//     } else {
//       setStatusMessage(response.message || "Invalid TOTP code.");
//       setIsSuccess(false);
//     }
//   };

//   if (loading) {
//     return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
//   }

//   if (statusMessage && !qrCodeData) {
//     return <div className="flex items-center justify-center min-h-screen text-red-500">{statusMessage}</div>;
//   }

//   const userEmail = useAuthStore.getState().email;

//   return (
//     <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950 p-4">
//       {/* ⬇️ Card made smaller (max-w-sm instead of max-w-md) */}
//       <Card className="w-full max-w-sm mx-auto">
//         <CardHeader className="text-center">
//           <CardTitle className="text-xl font-bold">Set Up Two-Factor Authentication</CardTitle>
//           <CardDescription>
//             Scan the QR code below with your authenticator app.
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-6 flex flex-col items-center">
//           {qrCodeData && (
//             <div className="border p-2 rounded-lg bg-white dark:bg-gray-800">
//               <img src={qrCodeData} alt="TOTP QR Code" className="max-w-[180px] sm:max-w-[220px] h-auto" />
//             </div>
//           )}
//           {userEmail && (
//             <p className="text-sm text-center text-gray-500 dark:text-gray-400">
//               Linked to email: <br className='sm:hidden' />
//               <strong className="text-blue-600 dark:text-blue-400">{userEmail}</strong>
//             </p>
//           )}
//           <Form {...form}>
//             <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
//               <FormField
//                 control={form.control}
//                 name="totpCode"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel className="text-center w-full block">
//                       Enter the 6-digit code
//                     </FormLabel>
//                     <FormControl>
//                       <div className="flex justify-center">
//                         {/* ⬇️ OTP inputs enlarged */}
//                         <InputOTP maxLength={6} {...field}>
//                           <InputOTPGroup>
//                             {Array.from({ length: 6 }).map((_, i) => (
//                               <InputOTPSlot
//                                 key={i}
//                                 index={i}
//                                 className="w-12 h-12 text-lg sm:w-14 sm:h-14 sm:text-xl"
//                               />
//                             ))}
//                           </InputOTPGroup>
//                         </InputOTP>
//                       </div>
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//               <Button type="submit" className="w-full" disabled={loading}>
//                 {loading ? 'Verifying...' : 'Verify & Complete Setup'}
//               </Button>
//             </form>
//           </Form>
//           {statusMessage && (
//             <div
//               className={`p-3 text-center rounded-md w-full ${
//                 isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
//               }`}
//             >
//               {statusMessage}
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// };

// export default TOTPSetupForm;
import React from 'react'

function TOTPSetupForm() {
  return (
    <div>TOTPSetupForm</div>
  )
}

export default TOTPSetupForm