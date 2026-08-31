// app/lease/onboard/OnboardClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useApi } from '@/hooks/useApi';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OnboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setInviteToken, setStep, resetRegistrationData, logout } = useAuthStore();
  const { token: jwtToken } = useAuthStore.getState();
  const { handleValidateInviteToken } = useApi();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateInvite();
  }, [searchParams]);

  const validateInvite = async () => {
    if (!searchParams) {
      setError('Invalid invite link. No parameters provided.');
      setLoading(false);
      return;
    }

    // Extract token from URL
    const tokens = searchParams.getAll('token');
    const token = tokens.filter(t => t && t.trim() !== '').pop() || null;
    
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

      // STEP 2: Store the invite token
      setInviteToken(token);

      // STEP 3: Route based on invite type
      if (isTenantInvite) {
        // ===== NEW FLOW: EVERYONE GOES TO LEASE INITIALIZE =====
        console.log('Tenant invite - redirecting to lease initialization');
        router.replace('/lease/initialize');
      } else {
        // ===== OTHER ROLE INVITES - EXISTING FLOW =====
        
        // Force logout if user is logged in (for non-tenant invites)
        if (jwtToken) {
          console.log('Non-tenant invite - forcing logout to process invite');
          
          await fetch('/browser-session/clear-cookie', { 
            method: 'POST',
            credentials: 'include'
          });
          
          logout();
          router.refresh();
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        resetRegistrationData();

        if (code === 'S0023' || code === 'S00141') {
          // Pre-assigned role - skip role selection, go to register
          console.log('Pre-assigned role - redirecting to registration');
          setStep('account');
          router.replace('/register');
        } else if (code === 'S00143') { 
          // User already accepted
          console.log('Invite already accepted');
          setStep('complete');
          router.replace('/login');
        } else if (code === 'S00142') {
          // Self-assign role - show role selection first
          console.log('Self-assign role - redirecting to role selection');
          setStep('role');
          router.replace('/role');
        } else {
          // Unexpected response code
          setError(`Unexpected response: ${response.description || 'Unknown error'}`);
          setLoading(false);
        }
      }
      
    } catch (err: any) {
      console.error('Error validating invite token:', err);
      setInviteToken(null);
      setError(
        err.response?.data?.description || 
        err.message || 
        'Failed to validate invite token. Please contact support.'
      );
      setLoading(false);
    }
  };

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
