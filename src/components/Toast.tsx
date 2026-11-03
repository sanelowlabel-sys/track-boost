import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((msg: string, d?: number) => showToast('success', msg, d), [showToast]);
  const error = useCallback((msg: string, d?: number) => showToast('error', msg, d), [showToast]);
  const info = useCallback((msg: string, d?: number) => showToast('info', msg, d), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md text-sm ${
                toast.type === 'success'
                  ? 'bg-[#182310]/95 border-[#82C321]/40 text-white'
                  : toast.type === 'error'
                  ? 'bg-[#291010]/95 border-red-500/40 text-white'
                  : 'bg-[#181818]/95 border-white/10 text-white'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-[#82C321]" />
                ) : toast.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                ) : (
                  <Info className="w-5 h-5 text-blue-400" />
                )}
              </div>

              <div className="flex-1 text-xs leading-relaxed font-medium">
                {toast.message}
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
