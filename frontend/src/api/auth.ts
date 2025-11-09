import Cookies from 'js-cookie';
import { lifeAppApi } from '@/lib/axios';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
  TokenRefreshResponse,
  PasswordResetRequest,
  PasswordResetConfirm,
  PasswordChange,
  Passkey,
} from '@/types/auth';
import type { Authenticator } from './allauth.types';

export const authApi = {
  // Authentication
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await lifeAppApi.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await lifeAppApi.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await lifeAppApi.post('/auth/logout');
  },

  refreshToken: async (): Promise<TokenRefreshResponse> => {
    const response = await lifeAppApi.post<TokenRefreshResponse>('/auth/token/refresh');
    return response.data;
  },

  // Current user
  getCurrentUser: async (): Promise<User> => {
    const response = await lifeAppApi.get<User>('/auth/user');
    return response.data;
  },

  updateUser: async (data: Partial<User>): Promise<User> => {
    const response = await lifeAppApi.patch<User>('/auth/user', data);
    return response.data;
  },

  deleteAccount: async (): Promise<void> => {
    await lifeAppApi.delete('/auth/user');
  },

  // Password management
  requestPasswordReset: async (data: PasswordResetRequest): Promise<void> => {
    await lifeAppApi.post('/auth/password/reset', data);
  },

  confirmPasswordReset: async (data: PasswordResetConfirm): Promise<void> => {
    await lifeAppApi.post('/auth/password/reset/confirm', data);
  },

  changePassword: async (data: PasswordChange): Promise<void> => {
    await lifeAppApi.post('/auth/password/change', data);
  },

  // Email verification
  sendVerificationEmail: async (): Promise<void> => {
    await lifeAppApi.post('/auth/email/verify');
  },

  confirmEmail: async (token: string): Promise<void> => {
    await lifeAppApi.post('/auth/email/verify/confirm', { token });
  },

  // OAuth initiation (kept here for convenience, uses allauth endpoint)
  initiateOAuth: (provider: string, options?: { process?: 'login' | 'connect'; callbackURL?: string }): void => {
    const process = options?.process || 'login';
    const callbackURL = options?.callbackURL || '/auth/oauth/callback';

    // django-allauth headless mode requires a form POST with CSRF token
    // See: https://github.com/pennersr/django-allauth/tree/main/examples/react-spa
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/_allauth/browser/v1/auth/provider/redirect';

    // Provider ID
    const providerInput = document.createElement('input');
    providerInput.type = 'hidden';
    providerInput.name = 'provider';
    providerInput.value = provider;
    form.appendChild(providerInput);

    // Process type (login or connect)
    const processInput = document.createElement('input');
    processInput.type = 'hidden';
    processInput.name = 'process';
    processInput.value = process;
    form.appendChild(processInput);

    // Callback URL (where to redirect after OAuth)
    const callbackInput = document.createElement('input');
    callbackInput.type = 'hidden';
    callbackInput.name = 'callback_url';
    callbackInput.value = window.location.origin + callbackURL;
    form.appendChild(callbackInput);

    // CSRF token
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrfmiddlewaretoken';
    csrfInput.value = Cookies.get('csrftoken') || '';
    form.appendChild(csrfInput);

    document.body.appendChild(form);
    form.submit();
  },

  // Passkeys (using allauth MFA WebAuthn endpoints)
  getPasskeys: async (): Promise<Passkey[]> => {
    const response = await lifeAppApi.get<{ data: Authenticator[] }>('/_allauth/browser/v1/account/authenticators');

    // Filter only webauthn authenticators and transform to Passkey format
    const webauthnAuthenticators = response.data.data.filter((auth) => auth.type === 'webauthn');

    return webauthnAuthenticators.map((auth) => ({
      id: auth.id,
      label: auth.name,
      createdAt: new Date(auth.createdAt * 1000).toISOString(),
      lastUsedAt: auth.lastUsedAt ? new Date(auth.lastUsedAt * 1000).toISOString() : undefined,
      isPasswordless: auth.isPasswordless,
    }));
  },

  updatePasskeyLabel: async (id: string, label: string): Promise<Passkey> => {
    await lifeAppApi.put<{ data: null }>('/_allauth/browser/v1/account/authenticators/webauthn', { id, name: label });

    // Return updated passkey (allauth returns null, so we construct it)
    return {
      id,
      label,
      createdAt: new Date().toISOString(),
      lastUsedAt: undefined,
      isPasswordless: true,
    };
  },

  deletePasskey: async (id: string): Promise<void> => {
    await lifeAppApi.delete('/_allauth/browser/v1/account/authenticators/webauthn', {
      data: { authenticators: [id] },
    });
  },
};
