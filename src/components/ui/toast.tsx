"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { ApiError } from "@/lib/api";
import styles from "./toast.module.css";

export type ToastTone = "info" | "success" | "warning" | "danger";

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void;
  /** Convenience for the common `catch` block: shows the server's own message. */
  toastError: (error: unknown, fallback: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Cap the stack at three so a burst of updates can't cover the page.
    setItems((prev) => [...prev.slice(-2), { id, message, tone }]);
  }, []);

  const toastError = useCallback(
    (error: unknown, fallback: string) => {
      const message =
        error instanceof ApiError && error.message ? error.message : fallback;
      toast(message, "danger");
    },
    [toast],
  );

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ toast, toastError }), [toast, toastError]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className={styles.region}
        role="status"
        aria-live="polite"
        aria-relevant="additions"
      >
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const Icon = ICONS[item.tone];

  useEffect(() => {
    // Failures stay up longer — they usually carry something to act on.
    const ms = item.tone === "danger" ? 6000 : 3800;
    const timer = window.setTimeout(() => onDismiss(item.id), ms);
    return () => window.clearTimeout(timer);
  }, [item.id, item.tone, onDismiss]);

  return (
    <div className={`${styles.toast} ${styles[item.tone]}`} role="status">
      <Icon size={18} className={styles.icon} aria-hidden />
      <p>{item.message}</p>
      <button
        type="button"
        className={styles.dismiss}
        aria-label="Dismiss notification"
        onClick={() => onDismiss(item.id)}
      >
        <X size={15} />
      </button>
    </div>
  );
}
