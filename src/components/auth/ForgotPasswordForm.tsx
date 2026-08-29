'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Mail, MessageSquare, Shield, Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, Check, RefreshCw } from 'lucide-react';

type Channel = "EMAIL" | "GOOGLE_TOTP" | "SMS";

interface VerificationOptions {
  email: boolean;
  phone: boolean;
  google: boolean;
  preferred: string;
}

// Validation schemas
const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const passwordSchema = z.object({
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/\d/, 'Include a number')
    .regex(/[^A-Za-z0-9]/, 'Include a special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type EmailFormData = z.infer<typeof emailSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ForgotPasswordForm() {
  const router = useRouter();
  const { getVerOptions, get_OTP, verifyTotpCodewithPass } = useAuth();
  const { setToken, setStep } = useAuthStore();

  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState('');
  const [availableChannels, setAvailableChannels] = useState<VerificationOptions | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);

  // Forms
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  // Resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Step 1: Email submission
  const handleEmailSubmit = async (values: EmailFormData) => {
    setLoading(true);

    try {
      const result = await getVerOptions(values.email);
      
      if (result.success) {
        setEmail(values.email);
        setAvailableChannels(result.options);
        setCurrentStep(2);
        toast.success('Email verified successfully');
      } else {
        toast.error(result.message || 'Failed to verify email');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Channel selection
  const handleChannelSelect = async (channel: Channel) => {
    setSelectedChannel(channel);

    // For EMAIL and SMS, send OTP
    if (channel === 'EMAIL' || channel === 'SMS') {
      setLoading(true);
      try {
        const result = await get_OTP(email, channel);
        
        if (result.success) {
          toast.success(result.message || 'OTP sent successfully');
          setTimeout(() => {
            setCurrentStep(3);
          }, 1000);
        } else {
          toast.error(result.message || 'Failed to send OTP');
        }
      } catch (err) {
        toast.error('Failed to send OTP');
      } finally {
        setLoading(false);
      }
    } else {
      // For GOOGLE_TOTP, go directly to OTP entry
      setCurrentStep(3);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (!canResend || !selectedChannel) return;

    setLoading(true);

    try {
      const result = await get_OTP(email, selectedChannel);
      
      if (result.success) {
        toast.success('New OTP sent successfully');
        setCanResend(false);
        setResendTimer(20);
      } else {
        toast.error(result.message || 'Failed to resend OTP');
      }
    } catch (err) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: OTP entry (just store, don't validate yet)
  const handleOTPContinue = () => {
    if (otpCode.length !== 6) {
      toast.error('Please enter the complete 6-character code');
      return;
    }
    setCurrentStep(4);
  };

  // Step 4: Password submission with OTP validation
  const handlePasswordSubmit = async (values: PasswordFormData) => {
    setLoading(true);

    try {
      const result = await verifyTotpCodewithPass(
        otpCode,
        email,
        selectedChannel!,
        values.newPassword
      );

      if (result.success) {
        const token = result.data
        setToken(token);
        setStep("complete");
        toast.success('Password reset successful! Logging you in...');
        setTimeout(() => {
          router.push('/continue-setup');
        }, 1500);
      } else {
        // Check if error is OTP-related
        if (result.error_code === 'E0040' || result.message.toLowerCase().includes('otp') || result.message.toLowerCase().includes('code')) {
          toast.error('Invalid or expired OTP. Please enter a new code.');
          setOtpCode('');
          setCurrentStep(3);
        } else {
          toast.error(result.message || 'Password reset failed');
        }
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Stepper component
  const Stepper = () => {
    const steps = [
      { number: 1, label: 'Email' },
      { number: 2, label: 'Channel' },
      { number: 3, label: 'Verify' },
      { number: 4, label: 'Password' },
    ];

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  currentStep > step.number
                    ? 'bg-green-500 text-white'
                    : currentStep === step.number
                    ? 'bg-[#EF4217] text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {currentStep > step.number ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.number}</span>
                )}
              </div>
              <span className="text-xs text-gray-600 hidden sm:block">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 transition-all ${
                  currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Get channel icon
  const getChannelIcon = (channel: Channel) => {
    switch (channel) {
      case 'EMAIL':
        return <Mail className="w-5 h-5" />;
      case 'SMS':
        return <MessageSquare className="w-5 h-5" />;
      case 'GOOGLE_TOTP':
        return <Shield className="w-5 h-5" />;
    }
  };

  // Get channel description
  const getChannelDescription = (channel: Channel) => {
    switch (channel) {
      case 'EMAIL':
        return 'Receive code via email';
      case 'SMS':
        return 'Receive code via SMS';
      case 'GOOGLE_TOTP':
        return 'Use your authenticator app';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stepper — hidden on step 1 so the clean email entry design is uncluttered */}
      {currentStep > 1 && <Stepper />}

      {/* Step 1: Email Entry */}
      {currentStep === 1 && (
        <div className="space-y-5">

          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold text-[#14235C] dark:text-white">Forgot password?</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email address, choose an available verification channel, and securely set a new password.
            </p>
          </div>

          {/* Form */}
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-[#14235C] dark:text-white">
                      Email address
                    </FormLabel>
                    <FormControl>
                      <div className="relative h-9">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        </div>
                        <Input
                          placeholder="you@example.com"
                          {...field}
                          className="pl-10 rounded-lg text-sm focus-visible:ring-[#EF4217]"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#EF4217] hover:bg-[#d63600] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                ) : (
                  <>Continue <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </Form>

          {/* Sign-in link */}
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Remembered your password?{' '}
            <a href="/login" className="font-semibold text-[#EF4217] hover:text-[#d63600] transition-colors">
              Sign in
            </a>
          </p>

          {/* Security info card */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
            <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Secure password recovery</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Reset links automatically expire for your safety.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Step 2: Channel Selection */}
      {currentStep === 2 && availableChannels && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Verification Method</h2>
            <p className="text-sm text-gray-600">
              Verifying: <span className="font-medium text-gray-900">{email}</span>
            </p>
          </div>

          <div className="space-y-3">
            {availableChannels.email && (
              <button
                onClick={() => handleChannelSelect('EMAIL')}
                disabled={loading}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#EF4217] hover:bg-[#EF4217]/5 transition-all duration-200 text-left disabled:opacity-50 group active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-lg bg-[#EF4217] text-white flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Email Verification</h3>
                  <p className="text-xs text-gray-600">Receive code via email</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#EF4217] group-hover:translate-x-1 transition-all duration-200" />
              </button>
            )}

            {availableChannels.phone && (
              <button
                onClick={() => handleChannelSelect('SMS')}
                disabled={loading}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#EF4217] hover:bg-[#EF4217]/5 transition-all duration-200 text-left disabled:opacity-50 group active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-lg bg-[#EF4217] text-white flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">SMS Verification</h3>
                  <p className="text-xs text-gray-600">Receive code via SMS</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#EF4217] group-hover:translate-x-1 transition-all duration-200" />
              </button>
            )}

            {availableChannels.google && (
              <button
                onClick={() => handleChannelSelect('GOOGLE_TOTP')}
                disabled={loading}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#EF4217] hover:bg-[#EF4217]/5 transition-all duration-200 text-left disabled:opacity-50 group active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-lg bg-[#EF4217] text-white flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Authenticator App</h3>
                  <p className="text-xs text-gray-600">Use your authenticator app</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#EF4217] group-hover:translate-x-1 transition-all duration-200" />
              </button>
            )}
          </div>

          <Button
            onClick={() => setCurrentStep(1)}
            variant="outline"
            className="w-full rounded-xl group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back
          </Button>
        </div>
      )}

      {/* Step 3: OTP Entry */}
      {currentStep === 3 && selectedChannel && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Verification Code</h2>
            <p className="text-sm text-gray-600">
              {selectedChannel === 'GOOGLE_TOTP'
                ? 'Enter the code from your authenticator app'
                : `Code sent to your ${selectedChannel === 'EMAIL' ? 'email' : 'phone'}`}
            </p>
          </div>

          <div className="flex flex-col items-center gap-6">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={(val) => setOtpCode(val)}
            >
              <InputOTPGroup className="gap-2">
                {[...Array(6)].map((_, i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 text-lg focus:border-[#EF4217] focus:ring-2 focus:ring-[#EF4217]/20 transition-all"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>

            {selectedChannel !== 'GOOGLE_TOTP' && (
              <button
                onClick={handleResendOTP}
                disabled={!canResend || loading}
                className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#EF4217] disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 transition-transform duration-300 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                {resendTimer > 0 ? (
                  <span>Resend in {resendTimer}s</span>
                ) : (
                  <span className="group-hover:translate-x-0.5 transition-transform">Resend Code</span>
                )}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => {
                setCurrentStep(2);
                setOtpCode('');
              }}
              variant="outline"
              className="flex-1 rounded-xl group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back
            </Button>
            <Button
              onClick={handleOTPContinue}
              className="flex-1 bg-[#EF4217] hover:bg-[#d63600] rounded-xl group"
              disabled={otpCode.length !== 6}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Password Entry */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Set New Password</h2>
            <p className="text-sm text-gray-600">Create a strong password for your account</p>
          </div>

          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-5">
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">New Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...field}
                          className="px-4 py-3 rounded-xl"
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Confirm Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...field}
                          className="px-4 py-3 rounded-xl"
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  variant="outline"
                  className="flex-1 rounded-xl group"
                >
                  <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#EF4217] hover:bg-[#d63600] rounded-xl group"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <Check className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
