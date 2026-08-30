'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AtSign, Check, CheckCircle2, Loader2, Mail, RotateCcw } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { RegistrationStepper } from '@/components/auth/RegistrationStepper';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const EXPIRY_SECONDS = 5 * 60; // 5 minutes

const formSchema = z.object({
  totpCode: z.string().length(6, { message: 'Your verification code must be 6 characters.' }),
});

const OTPForm: React.FC = () => {
  const { verifyTotpCode, get_OTP } = useAuth();
  const { email, setStep, resetRegistrationData } = useAuthStore();
  const authHydrated = useAuthHydrated();
  const router = useRouter();

  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiry, setExpiry] = useState(EXPIRY_SECONDS);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const guardCheckedRef = useRef(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { totpCode: '' },
  });

  // Step guard
  useEffect(() => {
    if (!authHydrated || guardCheckedRef.current) return;
    guardCheckedRef.current = true;
    if (useAuthStore.getState().step !== 'verify') router.replace('/register');
  }, [authHydrated, router]);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setResendCooldown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Expiry countdown
  useEffect(() => {
    if (expiry <= 0) return;
    const t = setTimeout(() => setExpiry((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [expiry]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleResendOTP = async () => {
    if (!canResend || !email) return;
    setResendLoading(true);
    try {
      const result = await get_OTP(email, 'EMAIL');
      if (result.success) {
        toast.success('New OTP sent successfully');
        setCanResend(false);
        setResendCooldown(20);
        setExpiry(EXPIRY_SECONDS);
      } else {
        toast.error(result.message || 'Failed to resend OTP');
      }
    } catch {
      toast.error('Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setVerifyLoading(true);
    try {
      const response = await verifyTotpCode(values.totpCode, email || '', 'EMAIL');
      if (response.success) {
        setStep('complete');
        setShowVerifiedModal(true);
        // Give the user a moment to read the modal before the redirect fires.
        setTimeout(() => {
          router.replace('/account-activated');
        }, 2000);
      } else {
        toast.error(response.message || 'Invalid verification code');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDifferentAccount = () => {
    resetRegistrationData();
    router.replace('/login');
  };

  const slotClass =
    '!w-10 sm:!w-12 !h-12 sm:!h-14 !rounded-xl !border-2 !border-gray-200 dark:!border-white/10 !bg-white dark:!bg-white/5 text-base font-bold text-[#14235C] dark:text-white shadow-none data-[active=true]:!border-[#EF4217] data-[active=true]:!ring-2 data-[active=true]:!ring-[#EF4217]/20 transition-all';

  return (
    <div className="w-full flex flex-col gap-6">

      {/* Stepper */}
      <RegistrationStepper currentStep={3} />

      {/* Email icon */}
      <div className="flex justify-center">
        <div className="relative w-20 h-20">
          <div className="w-20 h-20 bg-[#EF4217] rounded-3xl flex items-center justify-center shadow-lg shadow-[#EF4217]/20">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-10 bg-white dark:bg-[#1A1740] rounded-xl shadow-md border border-gray-100 dark:border-white/10 flex items-center justify-center">
            <AtSign className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-[#1A1740]">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>

      {/* Heading */}
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#14235C] dark:text-white">Verify your email</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          We&apos;ve sent a 6-character verification code to
        </p>
        <p className="text-sm font-semibold text-[#EF4217]">{email ?? 'your email'}</p>
      </div>

      {/* OTP input */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-[#14235C] dark:text-white text-center">Enter verification code</p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="totpCode"
              render={({ field }) => (
                <FormItem className="flex flex-col items-center">
                  <FormControl>
                    <InputOTP maxLength={6} {...field}>
                      <InputOTPGroup className="gap-1.5 sm:gap-2.5">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <InputOTPSlot key={i} index={i} className={slotClass} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormMessage className="text-xs mt-2 text-center" />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {/* Expiry timer */}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Code expires in{' '}
          <span className={`font-semibold ${expiry <= 60 ? 'text-red-500' : 'text-[#EF4217]'}`}>
            {formatTime(expiry)}
          </span>
        </p>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
        <div className="w-9 h-9 rounded-full border-2 border-gray-200 dark:border-white/20 flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#14235C] dark:text-white">Didn&apos;t receive the code?</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
            Check your spam folder or resend the code.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleResendOTP}
          disabled={!canResend || resendLoading}
          className="flex items-center gap-2 text-sm font-semibold text-[#EF4217] hover:text-[#d63600] disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {resendLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
        </button>

        <button
          onClick={form.handleSubmit(onSubmit)}
          disabled={verifyLoading || form.watch('totpCode').length !== 6}
          className="px-8 py-2.5 bg-[#EF4217] hover:bg-[#d63600] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          {verifyLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
          ) : (
            'Verify Email'
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={handleDifferentAccount}
        disabled={verifyLoading || resendLoading}
        className="self-center text-sm font-medium text-gray-500 underline-offset-4 hover:text-[#14235C] hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:text-white"
      >
        Use a different account
      </button>

      {/* ── Verified — continuing to onboarding ── */}
      <Dialog open={showVerifiedModal} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-sm p-0 overflow-hidden"
          showCloseButton={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="flex flex-col items-center px-8 pt-8 pb-6 gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-[#14235C] dark:text-white">Email Verified!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Continue to identity verification and secure account setup.
            </p>
            <Loader2 className="w-5 h-5 animate-spin text-[#EF4217] mt-1" />
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default OTPForm;
