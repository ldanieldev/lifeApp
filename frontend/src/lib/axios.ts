import Cookies from 'js-cookie';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import env from '@/config/env';

let accessToken: string | null = null;
let tokenRefreshPromise: Promise<string> | null = null;

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const lifeAppApi = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add access token and CSRF token
lifeAppApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add CSRF token
    const csrfToken = Cookies.get('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }

    // Add access token
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh on 401
lifeAppApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and we haven't retried yet, try to refresh the token
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // If there's already a refresh in progress, wait for it
        if (tokenRefreshPromise) {
          const newToken = await tokenRefreshPromise;
          setAccessToken(newToken);
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return lifeAppApi(originalRequest);
        }

        // Start a new token refresh
        tokenRefreshPromise = (async () => {
          const response = await axios.post<{ accessToken: string }>(
            `${env.apiBaseUrl}/auth/token/refresh`,
            {},
            {
              withCredentials: true,
              headers: {
                'X-CSRFToken': Cookies.get('csrftoken') || '',
              },
            }
          );
          return response.data.accessToken;
        })();

        const newToken = await tokenRefreshPromise;
        tokenRefreshPromise = null;

        setAccessToken(newToken);
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

        return lifeAppApi(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear token and reject
        tokenRefreshPromise = null;
        setAccessToken(null);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
