import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { setAccessToken } from '@/lib/axios';
import type { User, LoginCredentials, RegisterData } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const queryClient = useQueryClient();

  // Fetch current user with auto-refetch for silent token refresh
  const {
    data: user,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authApi.getCurrentUser,
    retry: false,
    refetchInterval: 14 * 60 * 1000, // Refresh every 14 minutes (access token expires in 15 minutes)
    refetchIntervalInBackground: true,
    enabled: isAuthenticated,
    staleTime: 13 * 60 * 1000, // Consider stale after 13 minutes
  });

  // Check if user is authenticated on mount by trying to refresh token and fetch user
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First try to refresh the token (this will use the httpOnly refresh token cookie)
        const tokenResponse = await authApi.refreshToken();
        setAccessToken(tokenResponse.accessToken);

        // Then fetch the user
        const currentUser = await authApi.getCurrentUser();
        queryClient.setQueryData(['currentUser'], currentUser);
        setIsAuthenticated(true);
      } catch (error) {
        // If refresh fails, user is not authenticated
        setIsAuthenticated(false);
        setAccessToken(null);
      } finally {
        setIsInitializing(false);
      }
    };

    checkAuth();
  }, [queryClient]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const response = await authApi.login(credentials);
      setAccessToken(response.accessToken);
      setIsAuthenticated(true);
      queryClient.setQueryData(['currentUser'], response.user);
    },
    [queryClient]
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const response = await authApi.register(data);
      setAccessToken(response.accessToken);
      setIsAuthenticated(true);
      queryClient.setQueryData(['currentUser'], response.user);
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAccessToken(null);
      setIsAuthenticated(false);
      queryClient.clear();
      setIsLoggingOut(false);
    }
  }, [queryClient]);

  const refetchUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isAuthenticated,
        isLoading: isInitializing || (isLoading && isAuthenticated),
        isLoggingOut,
        login,
        register,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
