/**
 * Django-allauth headless API client
 *
 * This provides a typed interface to all allauth endpoints.
 * Uses the existing axios instance for consistent configuration.
 */

import { lifeAppApi } from '@/lib/axios';
import {
  create,
  get,
  parseCreationOptionsFromJSON,
  parseRequestOptionsFromJSON,
} from '@github/webauthn-json/browser-ponyfill';
import type {
  AllauthResponse,
  AuthenticatorListResponse,
  ConfigData,
  LoginRequest,
  PasswordChangeRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  SessionData,
  SessionsResponse,
  SignupRequest,
  WebAuthnCreationOptionsResponse,
  WebAuthnRequestOptionsResponse,
} from './allauth.types';

// Base path for all allauth endpoints
const ALLAUTH_BASE = '/_allauth/browser/v1';

/**
 * Authentication endpoints
 */
export const authAPI = {
  /**
   * Get current session status
   * Returns user info if authenticated, or available auth flows if not
   */
  getSession: () => lifeAppApi.get<AllauthResponse<SessionData>>(`${ALLAUTH_BASE}/auth/session`),

  /**
   * Login with email and password
   */
  login: (data: LoginRequest) => lifeAppApi.post<AllauthResponse<SessionData>>(`${ALLAUTH_BASE}/auth/login`, data),

  /**
   * Sign up new user with email and password
   */
  signup: (data: SignupRequest) => lifeAppApi.post<AllauthResponse<SessionData>>(`${ALLAUTH_BASE}/auth/signup`, data),

  /**
   * Logout current user
   */
  logout: () => lifeAppApi.delete<AllauthResponse<null>>(`${ALLAUTH_BASE}/auth/session`),

  /**
   * Request password reset email
   */
  requestPasswordReset: (data: PasswordResetRequest) =>
    lifeAppApi.post<AllauthResponse<null>>(`${ALLAUTH_BASE}/auth/password/request`, data),

  /**
   * Reset password with token from email
   */
  resetPassword: (data: PasswordResetConfirmRequest) =>
    lifeAppApi.post<AllauthResponse<null>>(`${ALLAUTH_BASE}/auth/password/reset`, data),

  /**
   * Change password (requires authentication)
   */
  changePassword: (data: PasswordChangeRequest) =>
    lifeAppApi.post<AllauthResponse<null>>(`${ALLAUTH_BASE}/account/password/change`, data),

  /**
   * Verify email with code sent to email address
   */
  verifyEmail: (key: string) =>
    lifeAppApi.post<AllauthResponse<SessionData>>(`${ALLAUTH_BASE}/auth/email/verify`, { key }),

  /**
   * Resend email verification code
   * Used when user doesn't receive the original verification email
   */
  resendEmailVerificationCode: () => lifeAppApi.post<AllauthResponse<null>>(`${ALLAUTH_BASE}/auth/email/verify/resend`),
};

/**
 * Configuration endpoint
 */
export const configAPI = {
  /**
   * Get allauth configuration
   * Returns enabled features, providers, etc.
   */
  getConfig: () => lifeAppApi.get<AllauthResponse<ConfigData>>(`${ALLAUTH_BASE}/config`),
};

/**
 * WebAuthn/Passkey endpoints
 */
export const webAuthnAPI = {
  /**
   * Login with passkey (passwordless authentication)
   */
  loginWithPasskey: async () => {
    // Step 1: Get request options
    const optionsResp = await lifeAppApi.get<AllauthResponse<WebAuthnRequestOptionsResponse>>(
      `${ALLAUTH_BASE}/auth/webauthn/login`
    );

    const jsonOptions = optionsResp.data.data.requestOptions;
    const options = parseRequestOptionsFromJSON(jsonOptions);

    // Step 2: Get credential from authenticator
    const credential = await get(options);

    // Step 3: Send credential to server
    return lifeAppApi.post<AllauthResponse<SessionData>>(`${ALLAUTH_BASE}/auth/webauthn/login`, { credential });
  },

  /**
   * Signup with passkey (passwordless registration)
   * Step 1: Initialize signup with email
   */
  signupWithPasskey: async (email: string) => {
    return lifeAppApi.post<AllauthResponse<WebAuthnCreationOptionsResponse>>(`${ALLAUTH_BASE}/auth/webauthn/signup`, {
      email,
    });
  },

  /**
   * Signup with passkey (passwordless registration)
   * Step 2: Get creation options for the passkey
   */
  getSignupPasskeyOptions: async () => {
    return lifeAppApi.get<AllauthResponse<WebAuthnCreationOptionsResponse>>(`${ALLAUTH_BASE}/auth/webauthn/signup`);
  },

  /**
   * Signup with passkey (passwordless registration)
   * Step 3: Complete signup with created credential
   */
  completeSignupWithPasskey: async (name: string) => {
    // Get creation options
    const optionsResp = await lifeAppApi.get<AllauthResponse<WebAuthnCreationOptionsResponse>>(
      `${ALLAUTH_BASE}/auth/webauthn/signup`
    );

    const jsonOptions = optionsResp.data.data.creationOptions;
    const options = parseCreationOptionsFromJSON(jsonOptions);

    // Create credential
    const credential = await create(options);

    // Send credential to server
    return lifeAppApi.put<AllauthResponse<SessionData>>(`${ALLAUTH_BASE}/auth/webauthn/signup`, { name, credential });
  },

  /**
   * Add passkey to authenticated user's account
   * @param passwordless - Whether this passkey can be used for passwordless login
   */
  addPasskey: async (name: string, passwordless: boolean = true) => {
    // Step 1: Get creation options
    const url = passwordless
      ? `${ALLAUTH_BASE}/account/authenticators/webauthn?passwordless`
      : `${ALLAUTH_BASE}/account/authenticators/webauthn`;

    const optionsResp = await lifeAppApi.get<AllauthResponse<WebAuthnCreationOptionsResponse>>(url);

    const jsonOptions = optionsResp.data.data.creationOptions;
    const options = parseCreationOptionsFromJSON(jsonOptions);

    // Step 2: Create credential
    const credential = await create(options);

    // Step 3: Send credential to server
    // NOTE: credential is already in the correct JSON format from @github/webauthn-json
    // The library handles base64url encoding of ArrayBuffers automatically
    return lifeAppApi.post<AllauthResponse<{ recoveryCodesGenerated: boolean }>>(
      `${ALLAUTH_BASE}/account/authenticators/webauthn`,
      { name, credential }
    );
  },

  /**
   * Get list of all authenticators (including passkeys)
   */
  getAuthenticators: async () => {
    return lifeAppApi.get<AllauthResponse<AuthenticatorListResponse>>(`${ALLAUTH_BASE}/account/authenticators`);
  },

  /**
   * Update passkey name/label
   */
  updatePasskey: async (id: string, name: string) => {
    return lifeAppApi.put<AllauthResponse<null>>(`${ALLAUTH_BASE}/account/authenticators/webauthn`, { id, name });
  },

  /**
   * Delete one or more passkeys
   */
  deletePasskeys: async (ids: string[]) => {
    return lifeAppApi.delete<AllauthResponse<null>>(`${ALLAUTH_BASE}/account/authenticators/webauthn`, {
      data: { authenticators: ids },
    });
  },

  /**
   * Authenticate with passkey (2FA step after password login)
   */
  authenticateWithPasskey: async () => {
    // Step 1: Get request options
    const optionsResp = await lifeAppApi.get<AllauthResponse<WebAuthnRequestOptionsResponse>>(
      `${ALLAUTH_BASE}/auth/webauthn/authenticate`
    );

    const jsonOptions = optionsResp.data.data.requestOptions;
    const options = parseRequestOptionsFromJSON(jsonOptions);

    // Step 2: Get credential
    const credential = await get(options);

    // Step 3: Send credential
    return lifeAppApi.post<AllauthResponse<SessionData>>(`${ALLAUTH_BASE}/auth/webauthn/authenticate`, { credential });
  },

  /**
   * Re-authenticate with passkey (for sensitive operations)
   */
  reauthenticateWithPasskey: async () => {
    // Step 1: Get request options
    const optionsResp = await lifeAppApi.get<AllauthResponse<WebAuthnRequestOptionsResponse>>(
      `${ALLAUTH_BASE}/auth/webauthn/reauthenticate`
    );

    const jsonOptions = optionsResp.data.data.requestOptions;
    const options = parseRequestOptionsFromJSON(jsonOptions);

    // Step 2: Get credential
    const credential = await get(options);

    // Step 3: Send credential
    return lifeAppApi.post<AllauthResponse<SessionData>>(`${ALLAUTH_BASE}/auth/webauthn/reauthenticate`, {
      credential,
    });
  },
};

/**
 * Helper to dispatch auth change events
 * This allows components to react to auth state changes
 */
export function dispatchAuthChange(response: AllauthResponse<SessionData>) {
  const event = new CustomEvent('allauth.auth.change', { detail: response });
  document.dispatchEvent(event);
}

/**
 * Session management endpoints
 */
export const sessionAPI = {
  /**
   * Get all active sessions for the current user
   */
  getSessions: () => lifeAppApi.get<SessionsResponse>(`${ALLAUTH_BASE}/auth/sessions`),

  /**
   * Terminate specific sessions by ID
   * @param sessionIds - Array of session IDs to terminate
   */
  terminateSessions: (sessionIds: string[]) =>
    lifeAppApi.delete<SessionsResponse>(`${ALLAUTH_BASE}/auth/sessions`, {
      data: { sessions: sessionIds },
    }),
};

/**
 * Social account management endpoints
 */
export const socialAccountAPI = {
  /**
   * Get list of connected social accounts (OAuth providers)
   */
  getConnectedAccounts: async () => {
    return lifeAppApi.get<AllauthResponse<import('./allauth.types').SocialAccount[]>>(
      `${ALLAUTH_BASE}/account/providers`
    );
  },

  /**
   * Disconnect a social account
   * @param providerId - Provider ID (e.g., 'google', 'github')
   * @param accountUid - The UID of the account from the provider
   */
  disconnectAccount: async (providerId: string, accountUid: string) => {
    return lifeAppApi.delete<AllauthResponse<import('./allauth.types').SocialAccount[]>>(
      `${ALLAUTH_BASE}/account/providers`,
      {
        data: { provider: providerId, account: accountUid },
      }
    );
  },
};

/**
 * Email address management endpoints
 */
export const emailAPI = {
  /**
   * Get list of all email addresses for the current user
   */
  getEmailAddresses: () =>
    lifeAppApi.get<AllauthResponse<import('./allauth.types').EmailAddress[]>>(`${ALLAUTH_BASE}/account/email`),

  /**
   * Add a new email address (triggers verification email)
   * @param email - Email address to add
   * @returns Updated list of all email addresses
   */
  addEmail: (email: string) =>
    lifeAppApi.post<AllauthResponse<import('./allauth.types').EmailAddress[]>>(`${ALLAUTH_BASE}/account/email`, {
      email,
    }),

  /**
   * Mark an email address as primary (must be verified first)
   * @param email - Email address to make primary
   * @returns Updated list of all email addresses
   */
  markEmailAsPrimary: (email: string) =>
    lifeAppApi.patch<AllauthResponse<import('./allauth.types').EmailAddress[]>>(`${ALLAUTH_BASE}/account/email`, {
      email,
      primary: true,
    }),

  /**
   * Remove an email address (cannot remove primary email)
   * @param email - Email address to remove
   * @returns Updated list of remaining email addresses
   */
  removeEmail: (email: string) =>
    lifeAppApi.delete<AllauthResponse<import('./allauth.types').EmailAddress[]>>(`${ALLAUTH_BASE}/account/email`, {
      data: { email },
    }),

  /**
   * Request verification code for unverified email
   * @param email - Email address to verify
   */
  requestEmailVerification: (email: string) =>
    lifeAppApi.put<AllauthResponse<null>>(`${ALLAUTH_BASE}/account/email`, { email }),

  /**
   * Verify email address with code
   * Uses the same endpoint as signup verification
   * @param code - Verification code from email
   * @returns Session data (for account emails, this completes verification)
   */
  verifyEmailCode: (code: string) =>
    lifeAppApi.post<AllauthResponse<import('./allauth.types').SessionData>>(`${ALLAUTH_BASE}/auth/email/verify`, {
      key: code,
    }),
};

/**
 * Re-export types for convenience
 */
export type * from './allauth.types';
