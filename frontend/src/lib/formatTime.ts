/**
 * Time formatting utilities for session management
 */

import { formatDistanceToNow } from 'date-fns';

/**
 * Format a timestamp as relative time ("Active now", "Active 5 minutes ago", etc.)
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted relative time string
 *
 * @example
 * formatLastSeen(Date.now() / 1000) // "Active now"
 * formatLastSeen(Date.now() / 1000 - 300) // "Active 5 minutes ago"
 */
export function formatLastSeen(timestamp?: number): string {
  if (!timestamp) {
    return 'Unknown';
  }

  // Convert Unix timestamp (seconds) to milliseconds
  const date = new Date(timestamp * 1000);
  const now = Date.now();
  const secondsAgo = (now - date.getTime()) / 1000;

  // If within last 60 seconds, show "Active now"
  if (secondsAgo < 60) {
    return 'Active now';
  }

  // Otherwise use date-fns to format relative time
  return `Active ${formatDistanceToNow(date, { addSuffix: true })}`;
}

/**
 * Format a Unix timestamp as a readable date
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted date string (e.g., "December 15, 2024")
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a Unix timestamp as a readable date and time
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted date and time string (e.g., "Dec 15, 2024 at 3:30 PM")
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
