'use client';

import React, { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl sm:max-w-2xl',
};

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
  initialFocusRef,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  // Save the currently focused element on open and restore on unmount
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';

      const timer = setTimeout(() => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
        } else if (drawerRef.current) {
          const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (focusable.length > 0) {
            focusable[0].focus();
          } else {
            drawerRef.current.focus();
          }
        }
      }, 50);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
        if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
          triggerRef.current.focus();
        }
      };
    }
  }, [isOpen, initialFocusRef]);

  // Keyboard navigation: Escape key & Tab focus trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key dismissal
      if (closeOnEscape && e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Tab key focus trap
      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="presentation">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (closeOnBackdrop) onClose();
        }}
        aria-hidden="true"
      />

      {/* Slide-Over Panel Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10">
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descId : undefined}
          tabIndex={-1}
          className={cn(
            'w-screen border-l border-slate-200 bg-white shadow-2xl flex flex-col justify-between focus:outline-hidden',
            'animate-in slide-in-from-right duration-200 ease-out',
            sizeClasses[size],
            className,
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <h2
                    id={titleId}
                    className="text-base font-bold tracking-tight text-slate-900 leading-snug"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <div
                    id={descId}
                    className="text-xs text-slate-500 mt-0.5"
                  >
                    {description}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form / Content Area */}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>

          {/* Optional Footer Action Bar */}
          {footer && (
            <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
