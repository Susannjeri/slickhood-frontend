// app/lease/onboard/OnboardClient.tsx
'use client';

import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OnboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setInviteToken, setStep, resetRegistrationData } = useAuthStore();
  const jwtToken = useAuthStore(state => state.token);
  const sessionReady = useAuthStore(state => state.sessionReady);
  const { handleValidateInviteToken } = useApi();
  const { handleTokenRefresh } = useAuth();
  const processedTokenRef = useRef<string | null | undefined>(undefined);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const validateInvite = useCallback(async (token: string | null) => {
    if (!token) {
      setError('Invalid invite link. No token provided.');
      setLoading(false);
      return;
    }

    try {
      // STEP 1: Validate the token to determine invite type
      const response = await handleValidateInviteToken(token);
      const code = response.code;
      const isTenantInvite = code === 'S0058';

      // STEP 2: Route based on invite type. Registration resets must happen
      // before storing the token or the one-time invitation is silently lost.
      if (isTenantInvite) {
        // ===== NEW FLOW: EVERYONE GOES TO LEASE INITIALIZE =====
        console.log('Tenant invite - redirecting to lease initialization');
        setInviteToken(token);
        // Keep the one-time token in the destination URL as well as the
        // persisted store. This makes the invitation resilient to refreshes,
        // privacy controls and storage hydration races.
        router.replace(`/lease/initialize?token=${encodeURIComponent(token)}`);
      } else {
        if (code === 'S0023' || code === 'S00141') {
          // A bound invitation may belong to either an existing or a new user.
          // Start at sign-in to avoid duplicate accounts; new users can choose
          // Sign up and the same invitation token remains attached.
          resetRegistrationData();
          setInviteToken(token);
          setStep('account');
          const homeownerInvite = Array.isArray(response.data) && response.data.includes(
            '/dashboard/documents?type=ESTATE_RESIDENTIAL_AGREEMENT'
          );
          const returnTo = homeownerInvite ? `&returnTo=${encodeURIComponent('/lease/onboard')}` : '';
          router.replace(`/login?invitation=ready&token=${encodeURIComponent(token)}${returnTo}`);
        } else if (code === 'S00143' || code === 'S0025') {
          // Authenticated validation has already applied the invited role. A
          // homeowner invitation leads directly to the generated agreement.
          const destination = Array.isArray(response.data)
            ? response.data.find((value: unknown) =>
                typeof value === 'string'
                && value === '/dashboard/documents?type=ESTATE_RESIDENTIAL_AGREEMENT')
            : undefined;
          if (jwtToken && destination) {
            await handleTokenRefresh();
            const homeownerRole = useAuthStore.getState().roles.find(
              role => role.title.toLowerCase() === 'homeowner'
            );
            if (!homeownerRole) {
              throw new Error('Your homeowner access could not be refreshed. Please sign in again from the invitation.');
            }
            useAuthStore.getState().setActiveRole(homeownerRole);
            setInviteToken(null);
            setStep('complete');
            router.replace(destination);
            return;
          }
          setInviteToken(null);
          setStep('complete');
          router.replace(jwtToken ? '/continue-setup' : '/login');
        } else if (code === 'S00142' || code === 'S00178') {
          // Self-assign role - show role selection first
          resetRegistrationData();
          setInviteToken(token);
          setStep('role');
          router.replace('/role');
        } else {
          // Unexpected response code
          setError(`Unexpected response: ${response.description || 'Unknown error'}`);
          setLoading(false);
        }
      }
      
    } catch (err: unknown) {
      console.error('Error validating invite token:', err);
      setInviteToken(null);
      setError(
        (axios.isAxiosError<{ description?: string }>(err) && err.response?.data?.description) ||
        (err instanceof Error && err.message) ||
        'Failed to validate invite token. Please contact support.'
      );
      setLoading(false);
    }
  }, [handleTokenRefresh, handleValidateInviteToken, jwtToken, resetRegistrationData,
    router, setInviteToken, setStep]);

  useEffect(() => {
    // A link opened in a new tab must wait for the secure HttpOnly-cookie
    // session to hydrate. Otherwise an existing user is misclassified as a
    // guest and is sent back through registration.
    if (!sessionReady) return;
    const tokens = searchParams?.getAll('token') ?? [];
    const token = tokens.filter(value => value.trim() !== '').pop() ?? null;
    if (processedTokenRef.current === token) return;
    processedTokenRef.current = token;
    void validateInvite(token);
  }, [searchParams, sessionReady, validateInvite]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-center">Processing Invitation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-12 w-12 animate-spin text-[#EF4217]" />
            <p className="text-sm text-gray-600">Validating your invite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">{error}</p>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => router.push('/role')}
                className="w-full bg-[#EF4217]"
              >
                Sign up without invite
              </Button>
              <Button 
                onClick={() => router.push('/login')}
                variant="outline"
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
