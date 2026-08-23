import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../store/authStore';

export function formatCurrency(amount: string | number, explicitCurrency?: string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const currencyCode = explicitCurrency || useAuthStore.getState().user?.currency_code;
  
  if (currencyCode) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  }

  // Neutral fallback when no currency is available
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
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
