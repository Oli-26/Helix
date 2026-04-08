import { create } from 'zustand';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import { useEffect } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    // Auto remove
    setTimeout(
      () => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },
      toast.duration || 4000,
    );
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

// Convenience functions
export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'success', title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'error', title, message, duration: 6000 }),
  warning: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'warning', title, message }),
  info: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'info', title, message }),
};

const icons: Record<ToastType, React.ReactNode> = {
  success: <Check className="w-4 h-4" />,
  error: <X className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />,
};

const styles: Record<ToastType, { bg: string; icon: string; border: string }> = {
  success: {
    bg: 'bg-[var(--color-success-muted)]',
    icon: 'text-success bg-success/20',
    border: 'border-success/30',
  },
  error: {
    bg: 'bg-[var(--color-danger-muted)]',
    icon: 'text-danger bg-danger/20',
    border: 'border-danger/30',
  },
  warning: {
    bg: 'bg-[var(--color-warning-muted)]',
    icon: 'text-warning bg-warning/20',
    border: 'border-warning/30',
  },
  info: {
    bg: 'bg-[var(--color-accent-muted)]',
    icon: 'text-accent bg-accent/20',
    border: 'border-accent/30',
  },
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-10 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border ${styles[t.type].border} ${styles[t.type].bg} shadow-lg backdrop-blur-sm min-w-[300px] max-w-[420px]`}
          >
            <div className={`p-1.5 rounded-lg ${styles[t.type].icon} flex-shrink-0`}>
              {icons[t.type]}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="text-sm font-medium text-primary">{t.title}</div>
              {t.message && (
                <div className="text-xs text-secondary mt-0.5 truncate">
                  {t.message}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded hover:bg-hover text-tertiary hover:text-primary transition-colors flex-shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
