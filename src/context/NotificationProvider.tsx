// src/context/NotificationProvider.tsx
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { ToastContainer, type ToastItem, type ToastVariant } from '../components/ui/Toast';
import { ConfirmDialog, type ConfirmOptions } from '../components/ui/ConfirmDialog';

interface ToastApi {
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

interface ToastContextValue {
  toast: ToastApi;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const ConfirmContext = createContext<ConfirmContextValue | null>(null);

let idCounter = 0;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (variant: ToastVariant, message: string, title?: string) => {
      const id = ++idCounter;
      const duration = variant === 'error' ? 6000 : 4000;
      setToasts(prev => [...prev, { id, variant, message, title }]);
      window.setTimeout(() => dismissToast(id), duration);
    },
    [dismissToast]
  );

  const toast: ToastApi = {
    success: (message, title) => pushToast('success', message, title),
    error: (message, title) => pushToast('error', message, title),
    warning: (message, title) => pushToast('warning', message, title),
    info: (message, title) => pushToast('info', message, title),
  };

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve;
      setConfirmState(options);
    });
  }, []);

  const handleConfirmResult = (result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      <ConfirmContext.Provider value={{ confirm }}>
        {children}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <ConfirmDialog
          isOpen={confirmState !== null}
          options={confirmState}
          onConfirm={() => handleConfirmResult(true)}
          onCancel={() => handleConfirmResult(false)}
        />
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
};

/** Replaces window.alert(...) — call e.g. toast.success('Saved!') */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a <NotificationProvider>');
  return ctx.toast;
}

/** Replaces window.confirm(...) — await confirm({ message, variant: 'danger' }) returns boolean */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a <NotificationProvider>');
  return ctx.confirm;
}