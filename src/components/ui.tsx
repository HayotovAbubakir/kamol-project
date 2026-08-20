'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppSettings } from '@/context/AppSettingsContext';
import { cn, formatNumberInput, parseNumberInput } from '@/lib/utils';

export const uiInputClass = 'ui-input';
export const uiInputGroupClass = 'ui-input-group';
export const uiFieldLabelClass = 'ui-field-label';
export const uiSelectClass = 'ui-select';
export const uiChoiceCardClass = 'ui-choice-card';
export const uiChoiceCardActiveClass = 'ui-choice-card-active';
export const uiChoiceCardSelectedClass = 'ui-choice-card-selected';
export const uiSelectRowClass = 'ui-select-row';
export const uiSelectRowActiveClass = 'ui-select-row-active';
export const uiTogglePanelClass = 'ui-toggle-panel';
export const uiTogglePanelActiveClass = 'ui-toggle-panel-active';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Modal({ open, title, description, onClose, children, size = 'md' }: ModalProps) {
  const { t } = useAppSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const isFull = size === 'full';
  const maxW = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-3xl', full: '' }[size];

  if (isFull) {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="fixed inset-0 z-[100] flex flex-col bg-app-bg"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-app-border px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 flex-1">
            <h3 id="modal-title" className="font-display text-xl font-bold text-app-text sm:text-2xl">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-app-muted">{description}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="ui-icon-btn shrink-0" aria-label={t('common.close')}>
            ✕
          </button>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      className="ui-modal-backdrop z-[100]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn('ui-modal-panel', maxW)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="modal-title" className="font-display text-lg font-bold text-app-text">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-app-muted">{description}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="ui-icon-btn shrink-0" aria-label={t('common.close')}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, className, ...props }: InputProps) {
  return (
    <div>
      <label className={uiFieldLabelClass}>{label}</label>
      <input {...props} className={cn(uiInputClass, 'mt-1.5', className)} />
    </div>
  );
}

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function NumberInput({ label, value, onChange, className, maxLength, onWheel, ...props }: NumberInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let digits = String(e.target.value ?? '').replace(/\D/g, '');
    if (maxLength != null) digits = digits.slice(0, maxLength);
    onChange(digits);
  }

  function handleWheel(e: React.WheelEvent<HTMLInputElement>) {
    e.currentTarget.blur();
    onWheel?.(e);
  }

  return (
    <div>
      <label className={uiFieldLabelClass}>{label}</label>
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatNumberInput(value)}
        onChange={handleChange}
        onWheel={handleWheel}
        className={cn(uiInputClass, 'mt-1.5', className)}
      />
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { t } = useAppSettings();
  const [mounted, setMounted] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !confirming) onCancel();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel, confirming]);

  async function handleConfirm() {
    if (confirming) return;
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  }

  if (!open || !mounted) return null;

  const messageLines = message.split('\n').map((line) => line.trim()).filter(Boolean);

  return createPortal(
    <div className="ui-modal-backdrop z-[110]" onClick={onCancel} role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        className={cn(
          'ui-modal-panel ui-confirm-modal max-w-md',
          variant === 'danger' && 'border-deadline-red/35 ring-1 ring-deadline-red/15',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {variant === 'danger' && (
          <div className="mb-4 flex justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-deadline-red/10 text-deadline-red ring-1 ring-deadline-red/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </span>
          </div>
        )}

        <h3
          className={cn(
            'font-display text-xl font-bold leading-snug',
            variant === 'danger' ? 'text-center text-deadline-red' : 'text-app-text',
          )}
        >
          {title}
        </h3>

        {messageLines.length > 0 && (
          <div
            className={cn(
              'mt-4 space-y-2 text-sm leading-relaxed',
              variant === 'danger'
                ? 'rounded-xl border border-deadline-red/25 bg-deadline-red/8 px-4 py-4 text-app-text'
                : 'text-app-muted',
            )}
          >
            {messageLines.map((line, index) => (
              <p key={`${line}-${index}`} className={index === 0 && variant === 'danger' ? 'font-medium' : undefined}>
                {line}
              </p>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button variant={variant} className="flex-1" onClick={handleConfirm} disabled={confirming}>
            {confirming ? t('common.saving') : (confirmLabel ?? t('common.delete'))}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={confirming}>
            {cancelLabel ?? t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  size?: 'md' | 'sm';
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  const styles = {
    primary: 'ui-btn-primary',
    outline: 'ui-btn-outline',
    danger: 'ui-btn-danger',
    ghost: 'ui-btn-ghost',
  };

  return (
    <button
      type="button"
      {...props}
      className={cn(styles[variant], size === 'sm' && 'ui-btn-sm', className)}
    >
      {children}
    </button>
  );
}
