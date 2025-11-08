/**
 * Authentication flow routing utilities
 *
 * Maps django-allauth flow IDs to frontend routes
 */

import type { AuthFlow } from '@/api/allauth.types';

// Flow IDs from django-allauth
export const FlowIds = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  VERIFY_EMAIL: 'verify_email',
  PASSWORD_RESET: 'password_reset',
  PROVIDER_SIGNUP: 'provider_signup',
  MFA_AUTHENTICATE: 'mfa_authenticate',
  MFA_REAUTHENTICATE: 'mfa_reauthenticate',
  MFA_WEBAUTHN_SIGNUP: 'mfa_signup_webauthn',
} as const;

// Authenticator types
export const AuthenticatorTypes = {
  WEBAUTHN: 'webauthn',
  TOTP: 'totp',
  RECOVERY_CODES: 'recovery_codes',
} as const;

/**
 * Get the route path for a given authentication flow
 */
export function getRouteForFlow(flow: AuthFlow): string | null {
  const flowId = flow.id;

  // Handle flows with specific authenticator types
  if (flow.types && flow.types.length > 0) {
    // Prefer webauthn over other methods when multiple types are available
    // This provides the best UX for users with passkeys
    let type = flow.types[0];
    if (flow.types.includes(AuthenticatorTypes.WEBAUTHN)) {
      type = AuthenticatorTypes.WEBAUTHN;
    }

    if (flowId === FlowIds.MFA_AUTHENTICATE) {
      switch (type) {
        case AuthenticatorTypes.WEBAUTHN:
          return '/auth/authenticate/webauthn';
        case AuthenticatorTypes.TOTP:
          return '/auth/authenticate/totp';
        case AuthenticatorTypes.RECOVERY_CODES:
          return '/auth/authenticate/recovery-codes';
      }
    }

    if (flowId === FlowIds.MFA_REAUTHENTICATE) {
      switch (type) {
        case AuthenticatorTypes.WEBAUTHN:
          return '/auth/reauthenticate/webauthn';
        case AuthenticatorTypes.TOTP:
          return '/auth/reauthenticate/totp';
        case AuthenticatorTypes.RECOVERY_CODES:
          return '/auth/reauthenticate/recovery-codes';
      }
    }
  }

  // Handle flows without types
  switch (flowId) {
    case FlowIds.LOGIN:
      return '/auth/login';
    case FlowIds.SIGNUP:
      return '/auth/register';
    case FlowIds.VERIFY_EMAIL:
      return '/auth/verify-email';
    case FlowIds.PROVIDER_SIGNUP:
      return '/auth/provider/signup';
    case FlowIds.MFA_WEBAUTHN_SIGNUP:
      return '/auth/create-passkey';
    default:
      return null;
  }
}

/**
 * Find and return the route for a pending flow
 */
export function getRouteForPendingFlow(flows?: AuthFlow[]): string | null {
  if (!flows || flows.length === 0) {
    return null;
  }

  const pendingFlow = flows.find((flow) => flow.isPending);
  if (!pendingFlow) {
    return null;
  }

  return getRouteForFlow(pendingFlow);
}
