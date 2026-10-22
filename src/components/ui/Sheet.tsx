"use client";

import { ArrowLeft, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Open sheets, oldest first – Escape only closes the topmost one (e.g. the AuthSheet over a request sheet). */
const openSheets: string[] = [];

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** One muted line under the header, e.g. "Log in to send your request to Tom." */
  subtitle?: string;
  /** Shows a back arrow before the title (multi-step sheets). */
  onBack?: () => void;
  /** "wide": fixed 640px width (height follows content), 32px padding, 24px header icons. */
  size?: "default" | "wide";
  children: ReactNode;
}

const PANEL_SIZES = {
  default: "p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:max-w-lg md:p-6",
  wide: "p-8 pb-[max(2rem,env(safe-area-inset-bottom))] md:max-w-[640px]",
} as const;

/** Bottom sheet on mobile, centered modal on desktop. */
export function Sheet({ open, onClose, title, subtitle, onBack, size = "default", children }: SheetProps) {
  const t = useTranslations("common");
  const id = useId();
  // Latest onClose without re-running the effect – otherwise every parent re-render would re-register the
  // sheet and move it to the top of the stack.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    openSheets.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openSheets.at(-1) === id) onCloseRef.current();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      openSheets.splice(openSheets.indexOf(id), 1);
    };
  }, [open, id]);

  if (!open) return null;
  const iconSize = size === "wide" ? "size-6" : "size-5";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-black/40"
      />
      <div
        className={cn(
          "animate-sheet-in scroll-pane relative max-h-[90dvh] w-full rounded-t-3xl bg-white shadow-xl md:rounded-3xl",
          PANEL_SIZES[size],
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-200 md:hidden" />
        <div className={cn("flex items-center justify-between gap-4", !subtitle && "mb-4")}>
          <div className="flex min-w-0 items-center gap-1">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label={t("back")}
                className="-ml-1.5 rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100"
              >
                <ArrowLeft className={iconSize} />
              </button>
            )}
            <h2 className="truncate text-lg font-semibold">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100"
          >
            <X className={iconSize} />
          </button>
        </div>
        {subtitle && <p className="mb-6 mt-1 text-[15px] text-zinc-500">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
