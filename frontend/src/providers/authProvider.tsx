/**
 * Authentication Provider using django-allauth headless API
 *
 * Manages auth state using session-based authentication.
 * Listens to 'allauth.auth.change' events dispatched by axios interceptors.
 */

import { authAPI, configAPI, type AllauthResponse, type ConfigData, type SessionData, type User } from '@/api/allauth';
import { authApi } from '@/api/auth';
import { Skeleton } from '@/components/shadcn/skeleton';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuthContextType {
  // Current session response (includes user, flows, methods)
  auth: AllauthResponse<SessionData> | undefined;
  // Allauth configuration (providers, features, etc.)
  config: AllauthResponse<ConfigData> | undefined;
  // User object (for compatibility with old code)
  user: User | null;
  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  // Auth actions
  login: (credentials: { email: string; password: string }) => Promise<AllauthResponse<SessionData>>;
  register: (data: { email: string; password: string }) => Promise<AllauthResponse<SessionData>>;
  logout: () => Promise<void>;
  // Refresh session manually
  refetchUser: () => Promise<AllauthResponse<SessionData> | undefined>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [auth, setAuth] = useState<AllauthResponse<SessionData> | undefined>(undefined);
  const [config, setConfig] = useState<AllauthResponse<ConfigData> | undefined>(undefined);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load initial auth state and config
  useEffect(() => {
    const loadInitialState = async () => {
      // Load session and config in parallel, but handle errors independently
      const [sessionResult, configResult] = await Promise.allSettled([authAPI.getSession(), configAPI.getConfig()]);

      // Handle session result (401 is expected if not logged in)
      if (sessionResult.status === 'fulfilled') {
        const sessionData = sessionResult.value.data;

        // If authenticated, fetch full user profile to get firstName, lastName, sex
        if (sessionData.status === 200 && sessionData.data.user) {
          try {
            const fullUser = await authApi.getCurrentUser();
            // Merge full user profile into session data
            sessionData.data.user = {
              ...sessionData.data.user,
              ...fullUser,
            };
          } catch (error) {
            console.error('Failed to fetch full user profile:', error);
            // Continue with allauth user data (will be missing profile fields)
          }
        }

        setAuth(sessionData);
      } else {
        console.debug('No active session (expected if not logged in)');
        setAuth({
          status: 401,
          data: { flows: [] },
          meta: { isAuthenticated: false },
        });
      }

      // Handle config result (should always succeed)
      if (configResult.status === 'fulfilled') {
        setConfig(configResult.value.data);
      } else {
        console.error('Failed to load config:', configResult.reason);
        // Set minimal config to allow app to continue
        setConfig({
          status: 500,
          data: {
            account: {
              loginMethods: ['email'],
              isOpenForSignup: true,
              emailVerificationByCodeEnabled: false,
              loginByCodeEnabled: false,
              passwordResetByCodeEnabled: false,
              authenticationMethod: 'email',
            },
            socialaccount: { providers: [] },
            mfa: { supportedTypes: [], passkeyLoginEnabled: false },
            usersessions: { trackActivity: false },
          },
          meta: { isAuthenticated: false },
        });
      }
    };

    loadInitialState();
  }, []);

  // Listen for auth change events
  useEffect(() => {
    const handleAuthChange = async (event: CustomEvent<AllauthResponse<SessionData>>) => {
      const sessionData = event.detail;

      // If authenticated, fetch full user profile to get firstName, lastName, sex
      if (sessionData.status === 200 && sessionData.data.user) {
        try {
          const fullUser = await authApi.getCurrentUser();
          // Merge full user profile into session data
          sessionData.data.user = {
            ...sessionData.data.user,
            ...fullUser,
          };
        } catch (error) {
          console.error('Failed to fetch full user profile:', error);
          // Continue with allauth user data (will be missing profile fields)
        }
      }

      setAuth(sessionData);
    };

    document.addEventListener('allauth.auth.change', handleAuthChange as unknown as EventListener);

    return () => {
      document.removeEventListener('allauth.auth.change', handleAuthChange as unknown as EventListener);
    };
  }, []);

  // Login with email and password
  const login = async (credentials: { email: string; password: string }) => {
    const response = await authAPI.login(credentials);
    const sessionData = response.data;

    // If authenticated, fetch full user profile to get firstName, lastName, sex
    if (sessionData.status === 200 && sessionData.data.user) {
      try {
        const fullUser = await authApi.getCurrentUser();
        // Merge full user profile into session data
        sessionData.data.user = {
          ...sessionData.data.user,
          ...fullUser,
        };
      } catch (error) {
        console.error('Failed to fetch full user profile:', error);
        // Continue with allauth user data (will be missing profile fields)
      }
    }

    setAuth(sessionData);
    return sessionData;
  };

  // Register new user
  const register = async (data: { email: string; password: string }) => {
    const response = await authAPI.signup(data);
    const sessionData = response.data;

    // If authenticated, fetch full user profile to get firstName, lastName, sex
    if (sessionData.status === 200 && sessionData.data.user) {
      try {
        const fullUser = await authApi.getCurrentUser();
        // Merge full user profile into session data
        sessionData.data.user = {
          ...sessionData.data.user,
          ...fullUser,
        };
      } catch (error) {
        console.error('Failed to fetch full user profile:', error);
        // Continue with allauth user data (will be missing profile fields)
      }
    }

    setAuth(sessionData);
    return sessionData;
  };

  // Logout current user
  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await authAPI.logout();
      setAuth({
        status: 401,
        data: { flows: [] },
        meta: { isAuthenticated: false },
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Manual session refresh
  const refetchUser = async () => {
    try {
      const response = await authAPI.getSession();
      const sessionData = response.data;

      // If authenticated, fetch full user profile to get firstName, lastName, sex
      if (sessionData.status === 200 && sessionData.data.user) {
        try {
          const fullUser = await authApi.getCurrentUser();
          // Merge full user profile into session data
          sessionData.data.user = {
            ...sessionData.data.user,
            ...fullUser,
          };
        } catch (error) {
          console.error('Failed to fetch full user profile:', error);
          // Continue with allauth user data (will be missing profile fields)
        }
      }

      setAuth(sessionData);
      return sessionData;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      throw error;
    }
  };

  // Derived state
  const user = auth?.data?.user ?? null;
  const isAuthenticated = auth?.status === 200 || auth?.meta?.isAuthenticated === true;
  const isLoading = auth === undefined || config === undefined;

  return (
    <AuthContext.Provider
      value={{
        auth,
        config,
        user,
        isAuthenticated,
        isLoading,
        isLoggingOut,
        login,
        register,
        logout,
        refetchUser,
      }}
    >
      {isLoading ? (
        <div className="flex min-h-svh items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6">
            {/* Header skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>

            {/* Card skeleton */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full mt-4" />
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

/**
 * Hook to get current user (null if not authenticated)
 */
export function useUser() {
  const { auth } = useAuth();
  return auth?.data?.user ?? null;
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  const { auth } = useAuth();
  // User is authenticated if status is 200 OR if meta says authenticated (e.g., pending MFA)
  return auth?.status === 200 || auth?.meta?.isAuthenticated === true;
}

/**
 * Hook to get available auth flows
 */
export function useAuthFlows() {
  const { auth } = useAuth();
  return auth?.data?.flows ?? [];
}

/**
 * Hook to get authentication methods used
 */
export function useAuthMethods() {
  const { auth } = useAuth();
  return auth?.data?.methods ?? [];
}
