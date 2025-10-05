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
  Provider,
  Passkey,
} from '@/types/auth';

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

  // Providers
  getProviders: async (): Promise<string[]> => {
    const response = await lifeAppApi.get<string[]>('/auth/providers');
    return response.data;
  },

  getUserProviders: async (): Promise<Provider[]> => {
    const response = await lifeAppApi.get<Provider[]>('/auth/user/providers');
    return response.data;
  },

  connectProvider: async (provider: string): Promise<void> => {
    await lifeAppApi.post(`/auth/user/providers/${provider}/connect`);
  },

  disconnectProvider: async (provider: string): Promise<void> => {
    await lifeAppApi.delete(`/auth/user/providers/${provider}/disconnect`);
  },

  initiateOAuth: (provider: string): void => {
    window.location.href = `/api/auth/providers/${provider}/login`;
  },

  // Passkeys
  getPasskeys: async (): Promise<Passkey[]> => {
    const response = await lifeAppApi.get<{ results: Passkey[] }>('/auth/user/passkeys');
    return response.data.results || [];
  },

  updatePasskeyLabel: async (id: string, label: string): Promise<Passkey> => {
    const response = await lifeAppApi.put<Passkey>(`/auth/user/passkeys/${id}`, { label });
    return response.data;
  },

  deletePasskey: async (id: string): Promise<void> => {
    await lifeAppApi.delete(`/auth/user/passkeys/${id}`);
  },
};
