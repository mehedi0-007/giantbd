'use client';

import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base pulsing shimmer placeholder primitive
 */
export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}

interface TableSkeletonProps {
  /** Number of placeholder rows to display. Default: 5 */
  rows?: number;
  /** Number of columns or specific width percentages. Default: 5 */
  columns?: number | string[];
  /** Optional header title placeholder */
  hasHeader?: boolean;
  /** Optional custom class for container */
  className?: string;
}

/**
 * Accessible Table Shimmer Skeleton
 * Preserves standard table structure and prevents layout shifts (zero CLS)
 */
export function TableSkeleton({
  rows = 5,
  columns = 5,
  hasHeader = true,
  className = '',
}: TableSkeletonProps) {
  const colCount = Array.isArray(columns) ? columns.length : columns;
  const colWidths = Array.isArray(columns)
    ? columns
    : Array(colCount).fill(`${100 / colCount}%`);

  return (
    <div
      className={`w-full overflow-hidden ${className}`}
      role="status"
      aria-busy="true"
      aria-label="Loading data table..."
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          {hasHeader && (
            <thead className="border-b border-slate-100 bg-slate-50/80">
              <tr>
                {colWidths.map((width, idx) => (
                  <th
                    key={`th-${idx}`}
                    style={{ width }}
                    className="px-5 py-3.5 text-[11px] font-bold text-slate-400"
                  >
                    <Skeleton className="h-3.5 w-3/4 max-w-[120px]" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-slate-100/80 bg-white">
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={`tr-${rowIdx}`} className="transition-colors">
                {colWidths.map((width, colIdx) => (
                  <td
                    key={`td-${rowIdx}-${colIdx}`}
                    style={{ width }}
                    className="px-5 py-4"
                  >
                    <div className="space-y-2">
                      <Skeleton
                        className={`h-3.5 ${
                          colIdx === 0
                            ? 'w-4/5'
                            : colIdx === colWidths.length - 1
                            ? 'w-1/2 ml-auto'
                            : 'w-3/5'
                        }`}
                      />
                      {rowIdx % 2 === 0 && colIdx === 0 && (
                        <Skeleton className="h-2.5 w-2/5" />
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="sr-only">Loading content, please wait...</span>
    </div>
  );
}

interface CardSkeletonProps {
  count?: number;
  className?: string;
}

/**
 * Accessible Card / Metric Grid Shimmer Skeleton
 */
export function CardSkeleton({ count = 4, className = '' }: CardSkeletonProps) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
      role="status"
      aria-busy="true"
      aria-label="Loading metric cards..."
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`card-skel-${idx}`}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
      <span className="sr-only">Loading cards, please wait...</span>
    </div>
  );
}
