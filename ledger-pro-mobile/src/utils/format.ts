import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../store/authStore';

export function formatCurrency(amount: string | number, explicitCurrency?: string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const currencyCode = explicitCurrency || useAuthStore.getState().user?.currency_code;
  
  if (currencyCode) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(numericAmount);
  }

  // Neutral fallback when no currency is available
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatNumber(amount: string | number): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function getCurrencySymbol(currencyCode?: string): string {
  const code = currencyCode || useAuthStore.getState().company?.currency_code || useAuthStore.getState().user?.currency_code || 'USD';
  
  const manualMap: Record<string, string> = {
    'USD': '$',
    'GBP': '£',
    'INR': '₹',
    'PKR': 'Rs',
    'AED': 'AED',
    'AUD': 'A$',
    'CAD': 'C$',
    'SAR': 'SR'
  };

  if (manualMap[code]) {
    return manualMap[code];
  }

  try {
    const parts = new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).formatToParts(0);
    return parts.find(p => p.type === 'currency')?.value || code;
  } catch (e) {
    return code;
  }
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateString;
  }
}
