import { lifeAppApi } from '@/lib/axios';
import type { PasskeyRegistrationOptions, PasskeyAuthenticationOptions, AuthResponse } from '@/types/auth';

export const passkeyApi = {
  // Passkey registration flow
  beginRegistration: async (): Promise<PasskeyRegistrationOptions> => {
    const response = await lifeAppApi.post<PasskeyRegistrationOptions>('/auth/passkey/register/begin');
    return response.data;
  },

  completeRegistration: async (credential: PublicKeyCredential, label?: string): Promise<void> => {
    const credentialJSON = {
      id: credential.id,
      rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
      response: {
        clientDataJSON: btoa(
          String.fromCharCode(
            ...new Uint8Array((credential.response as AuthenticatorAttestationResponse).clientDataJSON)
          )
        ),
        attestationObject: btoa(
          String.fromCharCode(
            ...new Uint8Array((credential.response as AuthenticatorAttestationResponse).attestationObject)
          )
        ),
      },
      type: credential.type,
    };

    await lifeAppApi.post('/auth/passkey/register/complete', {
      credential: credentialJSON,
      label,
    });
  },

  // Passkey authentication flow
  beginAuthentication: async (): Promise<PasskeyAuthenticationOptions> => {
    const response = await lifeAppApi.post<PasskeyAuthenticationOptions>('/auth/passkey/authenticate/begin');
    return response.data;
  },

  completeAuthentication: async (credential: PublicKeyCredential): Promise<AuthResponse> => {
    const credentialJSON = {
      id: credential.id,
      rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
      response: {
        clientDataJSON: btoa(
          String.fromCharCode(...new Uint8Array((credential.response as AuthenticatorAssertionResponse).clientDataJSON))
        ),
        authenticatorData: btoa(
          String.fromCharCode(
            ...new Uint8Array((credential.response as AuthenticatorAssertionResponse).authenticatorData)
          )
        ),
        signature: btoa(
          String.fromCharCode(...new Uint8Array((credential.response as AuthenticatorAssertionResponse).signature))
        ),
        userHandle: (credential.response as AuthenticatorAssertionResponse).userHandle
          ? btoa(
              String.fromCharCode(
                ...new Uint8Array((credential.response as AuthenticatorAssertionResponse).userHandle!)
              )
            )
          : null,
      },
      type: credential.type,
    };

    const response = await lifeAppApi.post<AuthResponse>('/auth/passkey/authenticate/complete', {
      credential: credentialJSON,
    });
    return response.data;
  },

  // Passkey signup flow (passwordless registration)
  beginSignup: async (email: string): Promise<PasskeyRegistrationOptions> => {
    const response = await lifeAppApi.post<PasskeyRegistrationOptions>('/auth/passkey/signup', { email });
    return response.data;
  },

  // Passkey login flow (alternative entry point)
  login: async (): Promise<AuthResponse> => {
    const options = await passkeyApi.beginAuthentication();
    const credential = (await navigator.credentials.get({
      publicKey: {
        challenge: Uint8Array.from(atob(options.challenge), (c) => c.charCodeAt(0)),
        rpId: options.rpId,
        allowCredentials: options.allowCredentials?.map((cred) => ({
          ...cred,
          id: Uint8Array.from(atob(cred.id as unknown as string), (c) => c.charCodeAt(0)),
        })),
        timeout: options.timeout,
        userVerification: options.userVerification,
      },
    })) as PublicKeyCredential;

    return passkeyApi.completeAuthentication(credential);
  },
};
