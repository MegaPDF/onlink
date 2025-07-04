import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate unique short codes
export function generateShortCode(length: number = 8): string {
  return nanoid(length);
}

// Generate secure random tokens
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Hash sensitive data (like IPs for privacy)
export function hashData(data: string, salt?: string): string {
  const hashSalt = salt || process.env.HASH_SALT || 'default-salt';
  return crypto.createHash('sha256').update(data + hashSalt).digest('hex');
}

// Format numbers with commas
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

// Format bytes to human readable
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount / 100); // Stripe amounts are in cents
}

// Format relative time - FIXED
export function formatRelativeTime(date: Date | string | number): string {
  // Ensure we have a proper Date object
  const dateObj = new Date(date);
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return dateObj.toLocaleDateString();
}

// Safe date conversion utility
export function ensureDate(value: Date | string | number): Date {
  if (value instanceof Date) {
    return value;
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return date;
}

// Validate URL
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Extract domain from URL
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return '';
  }
}

// Get favicon URL
export function getFaviconUrl(url: string): string {
  try {
    const domain = extractDomain(url);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
