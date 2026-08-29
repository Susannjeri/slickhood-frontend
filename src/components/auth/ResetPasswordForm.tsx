// //ResetPasswordForm.tsx
// "use client";

// import { use, useState } from "react";
// import { z } from "zod";
// import { resetSchema, ResetSchema } from "@/lib/validations"; 
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   InputOTP,
//   InputOTPGroup,
//   InputOTPSlot,
// } from "@/components/ui/input-otp";
// import { useAuth } from "@/hooks/useAuth";
// import { useAuthStore } from "@/store/authStore";
// import { useRouter } from "next/navigation";
// import { Eye, EyeOff, RefreshCw } from "lucide-react"; // 👈 added Refresh icon



// interface ResetVerificationProps {
//   method: "EMAIL" | "GOOGLE_TOTP" | "SMS";
//   email: string;
// }

// // ----------------- COMPONENT -----------------
// export function ResetPasswordForm({ method, email }: ResetVerificationProps) {
//   const { setToken } = useAuthStore();
//   const [loading, setLoading] = useState(false);
//   const [resending, setResending] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);
//   const [showPassword, setShowPassword] = useState(false);

//   const router = useRouter();
//   const { verifyTotpCodewithPass, get_OTP } = useAuth(); // 👈 make sure get_OTP is exposed

//   const form = useForm<ResetSchema>({
//     resolver: zodResolver(resetSchema),
//     defaultValues: { code: "", newPassword: "", confirmPassword: "" },
//   });

//   // Handle password reset
//   const onSubmit = async (values: ResetSchema) => {
//     setLoading(true);
//     setError(null);
//     setSuccess(null);

//     try {
//       const res = await verifyTotpCodewithPass(
//         values.code,
//         email,
//         method,
//         values.newPassword
//       );

//       console.log("Response:", res);

//       if (res.success) {
//         setSuccess("✅ Password reset successful! Redirecting to login...");
//         setToken(res.data || null); // 👈 store the token if provided
//         console.log("Token set in store:", res.data);
//         setTimeout(() => {
//           router.push("/login");
//         }, 1500);
//       } else {
//         setError(res.message || "❌ Password reset failed. Try again.");
//       }
//     } catch (err: any) {
//       console.error("Error:", err);
//       setError("❌ Something went wrong. Please try again later.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Handle resend OTP
//   const handleResendOTP = async () => {
//     setResending(true);
//     setError(null);
//     setSuccess(null);

//     try {
//       const res = await get_OTP(email, channel); // 👈 call your endpoint
//       console.log("Resend OTP response:", res);

//       if (res.success) {
//         setSuccess("A new OTP has been sent to your email.");
//       } else {
//         setError(res.message || "❌ Failed to resend OTP. Try again.");
//       }
//     } catch (err) {
//       console.error("Error resending OTP:", err);
//       setError("❌ Could not resend OTP. Please try again later.");
//     } finally {
//       setResending(false);
//     }
//   };

//   return (
//     <form
//       onSubmit={form.handleSubmit(onSubmit)}
//       className="max-w-md mx-auto p-6 space-y-6 border rounded-lg shadow-md"
//     >
//       <h1 className="text-lg font-semibold text-center">
//         {method === "EMAIL" ? (
//           <>
//             Enter the OTP sent to your email <br />
//             <span className="text-gray-600">{email}</span>
//           </>
//         ) : (
//            "Enter the code from your Authenticator app"
//           )}
//       </h1>

//       {/* Success / Error Messages */}
//       {success && <p className="text-green-600 text-center">{success}</p>}
//       {error && <p className="text-red-600 text-center">{error}</p>}

//       {/* OTP Input */}
//       <div className="flex flex-col items-center gap-2">
//         <InputOTP
//           maxLength={6}
//           value={form.watch("code")}
//           onChange={(val) => form.setValue("code", val)}
//         >
//           <InputOTPGroup className=" gap-2">
//             {[...Array(6)].map((_, i) => (
//               <InputOTPSlot key={i} index={i} className="w-10 h-10 rounded-lg border-1 border-gray-600 text-lg text-center" />
//             ))}
//           </InputOTPGroup>
//         </InputOTP>
//         {form.formState.errors.code && (
//           <p className="text-sm text-red-500">
//             {form.formState.errors.code.message}
//           </p>
//         )}
//       </div>

//       {/* Resend OTP Button */}
//       {method === "EMAIL" && (
//         <div className="flex justify-center">
//           <Button
//             type="button"
//             variant="outline"
//             size="sm"
//             className="flex items-center gap-2"
//             onClick={handleResendOTP}
//             disabled={resending}
//           >
//             {resending ? (
//               "Resending..."
//             ) : (
//               <>
//                 <RefreshCw size={14} />
//                 Resend OTP
//               </>
//             )}
//           </Button>
//         </div>
//       )}

//       {/* Password Fields with Toggle */}
//       <div className="relative">
//         <Input
//           type={showPassword ? "text" : "password"}
//           placeholder="New password"
//           {...form.register("newPassword")}
//         />
//         <button
//           type="button"
//           className="absolute right-3 top-2 text-gray-500"
//           onClick={() => setShowPassword(!showPassword)}
//         >
//           {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
//         </button>
//       </div>

//       <div className="relative">
//         <Input
//           type={showPassword ? "text" : "password"}
//           placeholder="Confirm password"
//           {...form.register("confirmPassword")}
//         />
//       </div>
//       {form.formState.errors.confirmPassword && (
//         <p className="text-sm text-red-500">
//           {form.formState.errors.confirmPassword.message}
//         </p>
//       )}

//       <Button type="submit" className="w-full" disabled={loading}>
//         {loading ? "Resetting..." : "Reset Password"}
//       </Button>
//     </form>
//   );
// }
import React from 'react'

function ResetPasswordForm() {
  return (
    <div>ResetPasswordForm</div>
  )
}

export default ResetPasswordForm