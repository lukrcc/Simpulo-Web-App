"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/** Open sheets, oldest first – Escape only closes the topmost one (e.g. the AuthSheet over a request sheet). */
const openSheets: string[] = [];

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Bottom sheet on mobile, centered modal on desktop. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-black/40"
      />
      <div className="animate-sheet-in relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl md:max-w-lg md:rounded-3xl md:p-6">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-200 md:hidden" />
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
