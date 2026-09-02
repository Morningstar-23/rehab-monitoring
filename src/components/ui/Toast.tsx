// src/components/ui/Toast.tsx
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
  title?: string;
}

const VARIANT_CONFIG: Record<
  ToastVariant,
  { icon: React.ElementType; iconClass: string; barClass: string; defaultTitle: string }
> = {
  success: {
    icon: CheckCircle,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    barClass: 'bg-emerald-500',
    defaultTitle: 'Success',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-600 dark:text-red-400',
    barClass: 'bg-red-500',
    defaultTitle: 'Something went wrong',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-600 dark:text-amber-400',
    barClass: 'bg-amber-500',
    defaultTitle: 'Heads up',
  },
  info: {
    icon: Info,
    iconClass: 'text-brass-600 dark:text-brass-400',
    barClass: 'bg-brass-500',
    defaultTitle: 'Note',
  },
};

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-100 flex flex-col-reverse gap-2.5 w-[min(360px,calc(100vw-2.5rem))] pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => {
          const cfg = VARIANT_CONFIG[t.variant];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto relative overflow-hidden glass-panel rounded-2xl border hairline-brass shadow-2xl pl-4 pr-3 py-3 flex items-start gap-3"
            >
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.barClass}`} />
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.iconClass}`} />
              <div className="flex-1 min-w-0">
                <p className="font-display text-xs font-semibold text-sage-900">
                  {t.title || cfg.defaultTitle}
                </p>
                <p className="text-xs text-sage-600 mt-0.5 leading-relaxed wrap-break-word">
                  {t.message}
                </p>
              </div>
              <button
                onClick={() => onDismiss(t.id)}
                className="shrink-0 text-sage-400 hover:text-sage-600 p-0.5 rounded-lg hover:bg-sage-100 dark:hover:bg-sage-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};