/**
 * TypeScript types for django-allauth headless API responses
 * Based on allauth's OpenAPI spec and camelCase transformed responses
 */

// User model from our custom User
export interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  sex?: string | null;
  profilePictureUrl?: string;
  dateJoined: string;
}

// Authentication flow types
export interface AuthFlow {
  id: string;
  isPending?: boolean;
  providers?: string[];
  types?: string[];
}

// Authentication method (how user logged in)
export interface AuthMethod {
  method: 'password' | 'socialaccount' | 'webauthn';
  at: number;
  email?: string;
  provider?: string;
  uid?: string;
}

// Base response structure
export interface AllauthResponse<T = unknown> {
  status: number;
  data: T;
  meta: {
    isAuthenticated: boolean;
    sessionToken?: string; // Only in APP mode
  };
}

// Error response
export interface AllauthError {
  message: string;
  code: string;
  param?: string;
}

export interface AllauthErrorResponse {
  status: number;
  errors: AllauthError[];
}

// Session response
export interface SessionData {
  user?: User;
  methods?: AuthMethod[];
  flows?: AuthFlow[];
  errors?: AllauthError[];
}

// Config response
export interface AccountConfig {
  loginMethods: string[];
  isOpenForSignup: boolean;
  emailVerificationByCodeEnabled: boolean;
  loginByCodeEnabled: boolean;
  passwordResetByCodeEnabled: boolean;
  authenticationMethod: string;
}

export interface SocialAccountProvider {
  id: string;
  name: string;
  flows: string[];
  clientId?: string;
}

export interface SocialAccountConfig {
  providers: SocialAccountProvider[];
}

// Social account (connected provider)
export interface SocialAccount {
  uid: string; // Unique ID from OAuth provider
  provider: SocialAccountProvider;
  display: string; // Display string (email or username)
}

// User session (active session tracking)
export interface UserSession {
  id: string;
  userAgent: string;
  ip: string;
  createdAt: number; // Unix timestamp
  lastSeenAt?: number; // Unix timestamp
  isCurrent: boolean;
}

export interface SessionsResponse {
  data: UserSession[];
  meta: {
    isAuthenticated: boolean;
  };
}

export interface MFAConfig {
  supportedTypes: string[];
  passkeyLoginEnabled: boolean;
}

export interface ConfigData {
  account: AccountConfig;
  socialaccount: SocialAccountConfig;
  mfa: MFAConfig;
  usersessions: {
    trackActivity: boolean;
  };
}

// Request types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  key: string;
  password: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

// WebAuthn/Passkey types
import type {
  CredentialCreationOptionsJSON,
  CredentialRequestOptionsJSON,
} from '@github/webauthn-json/browser-ponyfill';

export interface WebAuthnCreationOptionsResponse {
  creationOptions: CredentialCreationOptionsJSON;
}

export interface WebAuthnRequestOptionsResponse {
  requestOptions: CredentialRequestOptionsJSON;
}

export interface WebAuthnCredentialRequest {
  credential: Record<string, unknown>; // PublicKeyCredential in JSON format
  name?: string;
}

export interface Authenticator {
  id: string;
  type: 'totp' | 'recovery_codes' | 'webauthn';
  name: string;
  createdAt: number; // Unix timestamp
  lastUsedAt?: number; // Unix timestamp
  isPasswordless?: boolean; // Only for webauthn type
}

export interface AuthenticatorListResponse {
  authenticators: Authenticator[];
}

// Email address management
export interface EmailAddress {
  email: string;
  primary: boolean;
  verified: boolean;
}
