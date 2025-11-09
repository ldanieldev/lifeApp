/**
 * Error handling utilities for API errors
 */

import { isAxiosError } from 'axios';
import type { AllauthError } from '@/api/allauth.types';

/**
 * Type guard to check if error is an Axios error with allauth error format
 */
export function isAllauthError(error: unknown): error is { response: { data: { errors: AllauthError[] } } } {
  return isAxiosError(error) && Array.isArray(error.response?.data?.errors);
}

/**
 * Extract allauth errors from an axios error
 */
export function getAllauthErrors(error: unknown): AllauthError[] | null {
  if (isAxiosError(error)) {
    const errors = error.response?.data?.errors;
    if (Array.isArray(errors)) {
      return errors as AllauthError[];
    }
  }
  return null;
}

/**
 * Check if error is a network error (no response or 5xx with no data)
 */
export function isNetworkError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  const hasResponseData = error.response?.data && Object.keys(error.response.data).length > 0;

  return !error.response || (status !== undefined && status >= 500 && !hasResponseData);
}
