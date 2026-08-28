'use client';

import React, { ReactNode } from 'react';
import NextLink from 'next/link';

interface ActionConfig {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
}

interface EmptyStateProps {
  /** Decorative icon or custom visual */
  icon?: ReactNode;
  /** Primary title headline */
  title: string;
  /** Explanatory description */
  description?: ReactNode;
  /** Primary call-to-action button or link */
  action?: ActionConfig;
  /** Optional secondary action button (e.g. Clear Filters) */
  secondaryAction?: ActionConfig;
  /** Compact sizing for widgets or drawers */
  compact?: boolean;
  className?: string;
}

/**
 * Accessible Empty State component for missing data, zero search results, or initial states
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className = '',
}: EmptyStateProps) {
  const renderAction = (act: ActionConfig, isPrimary: boolean) => {
    const variantClasses =
      act.variant === 'secondary'
        ? 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
        : act.variant === 'outline'
        ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        : isPrimary
        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50';

    const commonClasses = `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer min-h-[38px] ${variantClasses}`;

    if (act.href) {
      return (
        <NextLink href={act.href} className={commonClasses}>
          {act.icon}
          <span>{act.label}</span>
        </NextLink>
      );
    }

    return (
      <button type="button" onClick={act.onClick} className={commonClasses}>
        {act.icon}
        <span>{act.label}</span>
      </button>
    );
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-8 px-4' : 'py-16 px-6'
      } ${className}`}
    >
      {icon && (
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {action && renderAction(action, true)}
          {secondaryAction && renderAction(secondaryAction, false)}
        </div>
      )}
    </div>
  );
}
