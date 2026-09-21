import { useCallback, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { ToastContext, type ToastType } from "../hooks/useToast";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const TOAST_DURATION_MS = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => removeToast(id), TOAST_DURATION_MS);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = toast.type === "success" ? CheckCircle2 : XCircle;
            return (
              <motion.div
                key={toast.id}
                className={toast.type === "success" ? "toast toast-success" : "toast toast-error"}
                initial={{ opacity: 0, y: -16, x: 24 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
              >
                <Icon size={16} className="toast-icon" />
                <span className="toast-message">{toast.message}</span>
                <button
                  className="toast-close"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Dismiss notification"
                  type="button"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
