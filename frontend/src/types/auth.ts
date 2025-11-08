export interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  sex?: string | null;
  profilePictureUrl?: string;
  dateJoined: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface TokenRefreshResponse {
  accessToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface PasswordChange {
  oldPassword: string;
  newPassword: string;
}

export interface Provider {
  uid: string; // Unique ID from OAuth provider (e.g., Google ID)
  provider: {
    id: string; // Provider ID (e.g., 'google', 'github')
    name: string; // Display name (e.g., 'Google', 'GitHub')
    flows: string[]; // Supported flows
  };
  display: string; // Display string (e.g., email or username)
}

export interface Passkey {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt?: string;
  isPasswordless?: boolean;
}

export interface PasskeyRegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
}

export interface PasskeyAuthenticationOptions {
  challenge: string;
  rpId?: string;
  allowCredentials?: PublicKeyCredentialDescriptor[];
  timeout?: number;
  userVerification?: UserVerificationRequirement;
}
