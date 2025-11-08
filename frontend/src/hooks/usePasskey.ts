import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { webAuthnAPI } from '@/api/allauth';
import { useAuth } from '@/providers/authProvider';

/**
 * Hook for WebAuthn/Passkey operations
 * Uses django-allauth MFA WebAuthn endpoints
 */
export const usePasskey = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { refetchUser } = useAuth();

  /**
   * Check if WebAuthn is supported in the current browser
   */
  const isSupported =
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function';

  /**
   * Register a new passkey for the current authenticated user
   * @param label - A descriptive name for the passkey (e.g., "iPhone", "YubiKey")
   * @param passwordless - Whether this passkey can be used for passwordless login
   */
  const registerPasskey = useCallback(
    async (label: string, passwordless: boolean = true) => {
      if (!isSupported) {
        throw new Error('WebAuthn is not supported in this browser');
      }

      setIsLoading(true);
      try {
        await webAuthnAPI.addPasskey(label, passwordless);
        toast.success('Passkey registered successfully');

        // Invalidate passkeys query to refetch the list
        queryClient.invalidateQueries({ queryKey: ['passkeys'] });
      } catch (error: any) {
        console.error('Passkey registration error:', error);
        const errorMessage =
          error?.response?.data?.errors?.[0]?.message || error?.message || 'Failed to register passkey';
        toast.error(errorMessage);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [queryClient, isSupported]
  );

  /**
   * Authenticate using a passkey (passwordless login)
   */
  const authenticateWithPasskey = useCallback(async () => {
    if (!isSupported) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    setIsLoading(true);
    try {
      await webAuthnAPI.loginWithPasskey();

      // Refresh user session to get authenticated state
      await refetchUser();

      toast.success('Logged in with passkey');
    } catch (error: any) {
      console.error('Passkey authentication error:', error);
      const errorMessage =
        error?.response?.data?.errors?.[0]?.message || error?.message || 'Failed to authenticate with passkey';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [refetchUser, isSupported]);

  /**
   * Sign up with a passkey (passwordless registration)
   * Step 1: Initialize signup with email (does NOT create passkey yet)
   * @param email - User's email address
   * @returns Object with success flag and whether email verification is needed
   */
  const signupWithPasskey = useCallback(
    async (email: string) => {
      if (!isSupported) {
        throw new Error('WebAuthn is not supported in this browser');
      }

      setIsLoading(true);
      try {
        // Step 1: Initialize signup with email
        // This sends verification email and creates pending signup flow
        await webAuthnAPI.signupWithPasskey(email);

        // User needs to verify email first, then create passkey
        toast.success('Verification code sent! Please check your email.');
        return { success: true, needsEmailVerification: true, email };
      } catch (error: any) {
        console.error('Passkey signup error:', error);

        // Check if this is a 401 with verify_email flow (email verification pending)
        if (error?.response?.status === 401) {
          const flows = error?.response?.data?.data?.flows || [];
          const verifyEmailFlow = flows.find((flow: any) => flow.id === 'verify_email');

          if (verifyEmailFlow?.isPending) {
            // Account created successfully, needs email verification
            toast.success('Verification code sent! Please check your email.');
            return { success: true, needsEmailVerification: true, email };
          }
        }

        // Handle other errors
        const errorMessage =
          error?.response?.data?.errors?.[0]?.message || error?.message || 'Failed to sign up with passkey';
        toast.error(errorMessage);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported]
  );

  return {
    isLoading,
    isSupported,
    registerPasskey,
    authenticateWithPasskey,
    signupWithPasskey,
  };
};
