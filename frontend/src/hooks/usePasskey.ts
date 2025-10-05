import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { passkeyApi } from '@/api/passkey';
import { setAccessToken } from '@/lib/axios';
import { isWebAuthnSupported, createPasskey, getPasskey, base64ToUint8Array } from '@/utils/webauthn';
import type { PasskeyRegistrationOptions, PasskeyAuthenticationOptions } from '@/types/auth';

export const usePasskey = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  /**
   * Register a new passkey for the current user
   */
  const registerPasskey = useCallback(
    async (label?: string) => {
      if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn is not supported in this browser');
      }

      setIsLoading(true);
      try {
        // Step 1: Begin registration - get options from server
        const options: PasskeyRegistrationOptions = await passkeyApi.beginRegistration();

        // Step 2: Create credential using WebAuthn API
        const credential = await createPasskey({
          challenge: base64ToUint8Array(options.challenge) as BufferSource,
          rp: options.rp,
          user: {
            id: base64ToUint8Array(options.user.id) as BufferSource,
            name: options.user.name,
            displayName: options.user.displayName,
          },
          pubKeyCredParams: options.pubKeyCredParams,
          timeout: options.timeout,
          attestation: options.attestation,
          authenticatorSelection: options.authenticatorSelection,
        });

        // Step 3: Send credential to server
        await passkeyApi.completeRegistration(credential, label);

        toast.success('Passkey registered successfully');

        // Invalidate passkeys query to refetch the list
        queryClient.invalidateQueries({ queryKey: ['passkeys'] });
      } catch (error: any) {
        console.error('Passkey registration error:', error);
        toast.error(error?.message || 'Failed to register passkey');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [queryClient]
  );

  /**
   * Authenticate using a passkey
   */
  const authenticateWithPasskey = useCallback(async () => {
    if (!isWebAuthnSupported()) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    setIsLoading(true);
    try {
      // Step 1: Begin authentication - get options from server
      const options: PasskeyAuthenticationOptions = await passkeyApi.beginAuthentication();

      // Step 2: Get credential using WebAuthn API
      const credential = await getPasskey({
        challenge: base64ToUint8Array(options.challenge) as BufferSource,
        rpId: options.rpId,
        allowCredentials: options.allowCredentials?.map((cred) => ({
          ...cred,
          id: base64ToUint8Array(cred.id as unknown as string) as BufferSource,
        })) as PublicKeyCredentialDescriptor[],
        timeout: options.timeout,
        userVerification: options.userVerification,
      });

      // Step 3: Send credential to server for verification
      const response = await passkeyApi.completeAuthentication(credential);

      // Set access token and user data
      setAccessToken(response.accessToken);
      queryClient.setQueryData(['currentUser'], response.user);

      toast.success('Logged in with passkey');
      return response;
    } catch (error: any) {
      console.error('Passkey authentication error:', error);
      toast.error(error?.message || 'Failed to authenticate with passkey');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  /**
   * Sign up with a passkey (passwordless registration)
   */
  const signupWithPasskey = useCallback(async (email: string, label?: string) => {
    if (!isWebAuthnSupported()) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    setIsLoading(true);
    try {
      // Step 1: Begin signup - get options from server
      const options: PasskeyRegistrationOptions = await passkeyApi.beginSignup(email);

      // Step 2: Create credential using WebAuthn API
      const credential = await createPasskey({
        challenge: base64ToUint8Array(options.challenge) as BufferSource,
        rp: options.rp,
        user: {
          id: base64ToUint8Array(options.user.id) as BufferSource,
          name: options.user.name,
          displayName: options.user.displayName,
        },
        pubKeyCredParams: options.pubKeyCredParams,
        timeout: options.timeout,
        attestation: options.attestation,
        authenticatorSelection: options.authenticatorSelection,
      });

      // Step 3: Send credential to server
      await passkeyApi.completeRegistration(credential, label);

      toast.success('Account created with passkey');
    } catch (error: any) {
      console.error('Passkey signup error:', error);
      toast.error(error?.message || 'Failed to sign up with passkey');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    isSupported: isWebAuthnSupported(),
    registerPasskey,
    authenticateWithPasskey,
    signupWithPasskey,
  };
};
