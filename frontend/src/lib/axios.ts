/**
 * Axios instance for Life App API
 *
 * Configured for session-based authentication with django-allauth:
 * - Automatically includes CSRF token from cookies
 * - Uses withCredentials for session cookies
 * - No JWT token management needed
 */

import Cookies from 'js-cookie';
import axios, { type InternalAxiosRequestConfig } from 'axios';
import env from '@/config/env';

export const lifeAppApi = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true, // Required for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add CSRF token from cookies
lifeAppApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add CSRF token for all non-GET requests
    if (config.method !== 'get') {
      const csrfToken = Cookies.get('csrftoken');
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - dispatch auth change events on auth-related responses
lifeAppApi.interceptors.response.use(
  (response) => {
    // Check if this is an auth-related response
    const isAuthEndpoint = response.config.url?.includes('/_allauth/');
    const data = response.data;

    // Dispatch auth change event if response indicates auth state change
    if (isAuthEndpoint && data?.meta?.isAuthenticated !== undefined) {
      const event = new CustomEvent('allauth.auth.change', { detail: data });
      document.dispatchEvent(event);
    }

    return response;
  },
  (error) => {
    // For allauth endpoints, check if the response contains valid data despite HTTP error status
    const isAuthEndpoint = error.config?.url?.includes('/_allauth/');
    const data = error.response?.data;

    if (isAuthEndpoint && data?.status !== undefined) {
      // This is a valid allauth response (they return status in JSON body)
      // Dispatch auth change event if needed
      if (data?.meta?.isAuthenticated !== undefined) {
        const event = new CustomEvent('allauth.auth.change', { detail: data });
        document.dispatchEvent(event);
      }

      // Return the response data instead of rejecting
      // This allows callers to handle allauth's JSON status codes properly
      return { ...error.response, data };
    }

    // Handle 401 errors on non-allauth endpoints (session expired)
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Dispatch auth change event to update global auth state
      const unauthenticatedEvent = new CustomEvent('allauth.auth.change', {
        detail: {
          status: 401,
          data: { flows: [] },
          meta: { isAuthenticated: false },
        },
      });
      document.dispatchEvent(unauthenticatedEvent);

      // Redirect to login if not already on an auth page
      if (!window.location.pathname.startsWith('/auth')) {
        window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    // For non-allauth endpoints or invalid responses, reject as normal
    return Promise.reject(error);
  }
);
