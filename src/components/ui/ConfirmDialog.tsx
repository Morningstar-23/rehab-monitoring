// src/components/ui/ConfirmDialog.tsx
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' renders red/destructive styling; 'default' renders the brand (rehab) styling. */
  variant?: 'danger' | 'default';
}

interface ConfirmDialogProps {
  isOpen: boolean;
  options: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, options, onConfirm, onCancel }) => {
  const isDanger = options?.variant === 'danger';
  const Icon = isDanger ? AlertTriangle : HelpCircle;

  return (
    <AnimatePresence>
      {isOpen && options && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-110 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-sage-100 rounded-3xl border border-sage-200 dark:border-sage-300 hairline-brass shadow-2xl max-w-sm w-full p-6 space-y-5"
          >
            <div className="flex items-start space-x-3">
              <div
                className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                  isDanger
                    ? 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400'
                    : 'bg-brass-100 dark:bg-brass-500/15 text-brass-600 dark:text-brass-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="space-y-1 pt-0.5">
                <h3 className="font-display text-sm font-semibold text-sage-900">
                  {options.title || (isDanger ? 'Are you sure?' : 'Confirm')}
                </h3>
                <p className="text-xs text-sage-600 leading-relaxed whitespace-pre-line">
                  {options.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-sage-600 hover:bg-sage-100 dark:hover:bg-sage-200 rounded-xl transition-colors"
              >
                {options.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`px-5 py-2 text-white rounded-xl text-xs font-semibold shadow-md transition-colors cursor-pointer ${
                  isDanger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-rehab-700 dark:bg-rehab-600 hover:bg-rehab-800 dark:hover:bg-rehab-500'
                }`}
              >
                {options.confirmLabel || (isDanger ? 'Delete' : 'Confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};