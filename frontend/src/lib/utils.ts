import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    give_money: 'Give Money',
    receive_money: 'Receive Money',
    expense: 'Expense',
    income: 'Income',
    transfer: 'Account Transfer',
    purchase: 'Purchase',
    sale: 'Sale',
    credit_card_payment: 'CC Payment',
    opening_balance: 'Opening Balance',
  };
  return labels[type] || type;
}

export function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    bank: 'Bank',
    credit_card: 'Credit Card',
    person: 'Person',
    expense: 'Expense',
    income: 'Income',
    asset: 'Asset',
    liability: 'Liability',
    business: 'Business',
    equity: 'Equity',
  };
  return labels[type] || type;
}

export function getAccountTypeColor(type: string): string {
  const colors: Record<string, string> = {
    cash: 'text-emerald-500',
    bank: 'text-blue-500',
    credit_card: 'text-orange-500',
    person: 'text-purple-500',
    expense: 'text-red-500',
    income: 'text-green-500',
    asset: 'text-cyan-500',
    liability: 'text-amber-500',
    business: 'text-indigo-500',
  };
  return colors[type] || 'text-gray-500';
}
