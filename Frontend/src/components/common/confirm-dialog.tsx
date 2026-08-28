'use client';

import React, { useRef } from 'react';
import { Modal } from './modal';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  const icon = isDanger || isWarning ? (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
        isDanger ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600',
      )}
    >
      <AlertTriangle className="h-5 w-5" />
    </div>
  ) : (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
      <Info className="h-5 w-5" />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) onClose();
      }}
      role="alertdialog"
      size="md"
      icon={icon}
      title={title}
      description={description}
      initialFocusRef={cancelBtnRef}
      closeOnEscape={!isLoading}
      closeOnBackdrop={!isLoading}
      footer={
        <>
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-h-[40px] disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={async () => {
              await onConfirm();
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold text-white transition cursor-pointer min-h-[40px] shadow-sm disabled:opacity-50',
              isDanger &&
                'bg-red-600 hover:bg-red-700 shadow-red-500/20 focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
              isWarning &&
                'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
              !isDanger &&
                !isWarning &&
                'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            )}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </>
      }
    >
      <div className="sr-only">Confirmation dialog for {title}</div>
    </Modal>
  );
}
