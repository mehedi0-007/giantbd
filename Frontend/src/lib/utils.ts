import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr?: string | Date | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(num?: number | null): string {
  if (num === undefined || num === null) return '0';
  return new Intl.NumberFormat('en-US').format(num);
}

export interface BatchAgeInfo {
  days: number;
  label: string;
  category: 'FRESH' | 'NORMAL' | 'AGING' | 'CRITICAL';
  badgeClass: string;
  dotClass: string;
}

export function calculateBatchAge(productionDate?: string | Date | null): BatchAgeInfo {
  if (!productionDate) {
    return {
      days: 0,
      label: 'N/A',
      category: 'FRESH',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      dotClass: 'bg-slate-400',
    };
  }

  const prodTime = new Date(productionDate).getTime();
  const now = new Date().getTime();
  const diffDays = Math.max(0, Math.floor((now - prodTime) / (1000 * 60 * 60 * 24)));

  if (diffDays < 30) {
    return {
      days: diffDays,
      label: diffDays === 0 ? 'Today (Fresh)' : `${diffDays}d (Fresh)`,
      category: 'FRESH',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
    };
  }

  if (diffDays < 90) {
    return {
      days: diffDays,
      label: `${diffDays}d (Normal)`,
      category: 'NORMAL',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      dotClass: 'bg-blue-500',
    };
  }

  if (diffDays < 180) {
    return {
      days: diffDays,
      label: `${diffDays}d (Aging)`,
      category: 'AGING',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
      dotClass: 'bg-amber-500',
    };
  }

  return {
    days: diffDays,
    label: `${diffDays}d (Stale >6mo)`,
    category: 'CRITICAL',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 font-bold',
    dotClass: 'bg-rose-500',
  };
}
