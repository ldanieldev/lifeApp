/**
 * User agent parsing utilities
 * Parses user agent strings into human-readable device information
 */

import { UAParser } from 'ua-parser-js';

/**
 * Parse a user agent string into a readable format
 * Returns a string like "Chrome 120 on macOS" or "Firefox 115 on Windows"
 *
 * @param userAgent - Raw user agent string
 * @returns Formatted string with browser and OS, or raw string if parsing fails
 *
 * @example
 * parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
 * // Returns: "Chrome 120 on macOS"
 */
export function parseUserAgent(userAgent: string): string {
  try {
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();

    // If we can't parse either browser or OS, return the raw string
    if (!browser.name || !os.name) {
      return userAgent;
    }

    // Get major version number (e.g., "120.0.6099.109" -> "120")
    const browserVersion = browser.version?.split('.')[0] || '';
    const browserName = browser.name + (browserVersion ? ` ${browserVersion}` : '');

    return `${browserName} on ${os.name}`;
  } catch (error) {
    // If parsing fails, return the raw string as fallback
    console.warn('Failed to parse user agent:', error);
    return userAgent;
  }
}

/**
 * Get device type from user agent
 * @param userAgent - Raw user agent string
 * @returns Device type: 'mobile', 'tablet', 'desktop', or 'unknown'
 */
export function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
  try {
    const parser = new UAParser(userAgent);
    const device = parser.getDevice();

    if (device.type === 'mobile') return 'mobile';
    if (device.type === 'tablet') return 'tablet';
    if (device.type) return device.type as 'mobile' | 'tablet' | 'desktop';

    // If no device type, assume desktop
    return 'desktop';
  } catch {
    return 'unknown';
  }
}
