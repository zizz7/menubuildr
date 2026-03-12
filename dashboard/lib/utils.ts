import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the API base URL (e.g. http://192.168.1.5:5000/api).
 * Uses the browser's hostname so LAN clients reach the correct server.
 */
export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:5000/api`;
  return 'http://localhost:5000/api';
}

/**
 * Returns the server origin (e.g. http://192.168.1.5:5000) without the /api suffix.
 * Useful for constructing asset URLs (uploads, images, etc.).
 */
export function getServerUrl(): string {
  return getApiUrl().replace('/api', '');
}

/**
 * Resolves an asset URL. External URLs are returned as-is.
 * Relative paths are prefixed with the server origin so they work from any host.
 */
export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url || !url.trim()) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `${getServerUrl()}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}