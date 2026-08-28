'use client';

import React, { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  role?: 'dialog' | 'alertdialog';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-[95vw] h-[90vh]',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = 'md',
  role = 'dialog',
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
  initialFocusRef,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  // Save the currently focused element on open to restore focus on close
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';

      // Focus management: initialFocusRef or first focusable element or modal container
      const timer = setTimeout(() => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
        } else if (modalRef.current) {
          const focusable = modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (focusable.length > 0) {
            focusable[0].focus();
          } else {
            modalRef.current.focus();
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
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={() => {
          if (closeOnBackdrop) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog Container */}
      <div
        ref={modalRef}
        role={role}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all',
          'animate-in fade-in zoom-in-95 duration-150',
          'focus:outline-hidden',
          sizeClasses[size],
          className,
        )}
      >
        {/* Header */}
        {(title || description || icon) && (
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
            <div className="flex items-start gap-3">
              {icon && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <h2
                    id={titleId}
                    className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-snug"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <div
                    id={descId}
                    className="text-xs sm:text-sm text-slate-500 mt-0.5"
                  >
                    {description}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="relative text-sm text-slate-700">{children}</div>

        {/* Optional Footer Action Bar */}
        {footer && (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
