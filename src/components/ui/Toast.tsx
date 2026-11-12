"use client";

import { Bell, CircleCheck } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";

type ToastTone = "done" | "notify";

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
  /** The message is a link to here */
  href?: string;
  action?: ToastAction;
  placement: "top" | "bottom";
}

/** A small text button after the message, e.g. "Undo"; pressing it closes the toast. */
interface ToastAction {
  label: string;
  onClick: () => void;
}

/**
 * `href`: the message links there. `options.action`: "Declined · Undo"; `options.ms`: how long it stays (default 4s); `options.placement`:
 * "bottom" – centred at the bottom, for a quiet confirmation (Settings' "Saved").
 */
type ShowToast = (message: string, tone?: ToastTone, href?: string, options?: { action?: ToastAction; ms?: number; placement?: "top" | "bottom" }) => void;

const ToastContext = createContext<ShowToast | null>(null);

const TOAST_MS = 4000;

/**
 * One toast at a time, answering what you just did: top right under the header, glass, gone after 4s; a new one takes its place. What
 * happens elsewhere goes to the bell (and in dev to the Dev menu's log), never here.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback<ShowToast>((message, tone = "done", href, options) => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, tone, href, action: options?.action, placement: options?.placement ?? "top" });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), options?.ms ?? TOAST_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        aria-live="polite"
        className={
          toast?.placement === "bottom"
            ? "pointer-events-none fixed bottom-[calc(var(--safe-bottom)+24px)] left-1/2 z-[80] flex w-[min(380px,calc(100vw-2*var(--page-margin)))] -translate-x-1/2 justify-center"
            : "pointer-events-none fixed right-(--page-margin) top-[calc(var(--header-total)+8px)] z-[80] w-[min(380px,calc(100vw-2*var(--page-margin)))]"
        }
      >
        {toast && (
          <GlassPanel key={toast.id} className="animate-toast-in flex items-start gap-2 rounded-[20px]! px-4 py-3 text-body font-medium text-ink">
            {toast.tone === "notify" ? <Bell className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden /> : <CircleCheck className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />}
            {toast.href ? (
              <a href={toast.href} className="pointer-events-auto min-w-0 underline underline-offset-4">
                {toast.message}
              </a>
            ) : (
              <span className="min-w-0">{toast.message}</span>
            )}
            {toast.action && (
              <>
                <span aria-hidden className="text-muted">·</span>
                <button
                  type="button"
                  onClick={() => {
                    clearTimeout(timer.current);
                    setToast(null);
                    toast.action?.onClick();
                  }}
                  className="pointer-events-auto -my-1 -mr-1 rounded-full px-2 py-1 font-semibold text-ink transition-colors duration-150 hover:bg-ink/6 focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
                >
                  {toast.action.label}
                </button>
              </>
            )}
          </GlassPanel>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error("useToast must be used inside <ToastProvider>");
  return showToast;
}
