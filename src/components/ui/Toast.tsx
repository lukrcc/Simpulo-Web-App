"use client";

import { Bell, CircleCheck } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type ToastTone = "done" | "notify";

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

type ShowToast = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<ShowToast | null>(null);

const TOAST_MS = 2600;
/** An action and its notification often fire together – keep both visible, never more than three. */
const MAX_TOASTS = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const showToast = useCallback<ShowToast>((message, tone = "done") => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((list) => [...list, { id, message, tone }].slice(-MAX_TOASTS));
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setToasts((list) => list.filter((t) => t.id !== id));
    }, TOAST_MS);
    timers.current.add(timer);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-8"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-toast-in flex max-w-full items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg"
          >
            {toast.tone === "notify" ? (
              <Bell className="size-4 shrink-0 text-white/70" />
            ) : (
              <CircleCheck className="size-4 shrink-0 text-accent" />
            )}
            <span className="truncate">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error("useToast must be used inside <ToastProvider>");
  return showToast;
}
