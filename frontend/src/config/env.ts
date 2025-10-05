/**
 * Environment Configuration
 * Following 12-factor app principles with sensible defaults
 */

const env = {
  /**
   * API Base URL
   * Default: '/api' (proxied in development via vite.config.ts)
   * Production: Set VITE_API_BASE_URL to your backend API URL
   */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
} as const;

export default env;
