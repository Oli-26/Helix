import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[300]"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[30%] left-1/2 -translate-x-1/2 w-[400px] z-[301] bg-secondary border border-default rounded-xl shadow-lg overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className={`p-2 rounded-lg flex-shrink-0 ${danger ? 'bg-danger-muted' : 'bg-warning-muted'}`}>
                  <AlertTriangle className={`w-5 h-5 ${danger ? 'text-danger' : 'text-warning'}`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-primary mb-1">{title}</h3>
                  <p className="text-xs text-secondary leading-relaxed">{message}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-sm text-secondary bg-tertiary rounded-lg hover:bg-hover transition-colors"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                    danger
                      ? 'bg-danger hover:opacity-90'
                      : 'bg-accent hover:bg-accent-hover'
                  }`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
