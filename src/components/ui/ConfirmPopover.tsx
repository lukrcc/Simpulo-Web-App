"use client";

import { useRef, useState, type ReactNode } from "react";
import { useDismiss } from "@/components/explore/Filters";
import { Button } from "@/components/ui/ActionButton";
import { cn } from "@/lib/utils";
import { MenuLayer } from "@/components/ui/MenuLayer";

/** A small "Are you sure?" on milk glass under its trigger: the question, the action, "Keep". Escape or a click outside closes it. */
export function ConfirmPopover({ trigger, title, text, confirmLabel, cancelLabel, onConfirm, triggerClassName }: { trigger: ReactNode; title: string; text?: string; confirmLabel: string; cancelLabel: string; onConfirm: () => void; triggerClassName?: string }) {
  const anchor = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useDismiss(open, () => setOpen(false), anchor, anchor, panel);
  return (
    <>
      <button ref={anchor} type="button" onClick={() => setOpen((on) => !on)} aria-expanded={open} className={cn("font-semibold text-ink underline-offset-4 hover:underline", triggerClassName)}>
        {trigger}
      </button>
      <MenuLayer open={open} onClose={() => setOpen(false)} anchor={anchor} panelRef={panel} align="start" width={300} label={title} tone="light" panelProps={{ role: "dialog", "aria-label": title }} panelClassName="glass-panel animate-fade-in w-[min(300px,calc(100vw-32px))] rounded-[20px]! p-4">
            <p className="text-body font-semibold text-ink">{title}</p>
            {text && <p className="mt-1 text-small text-muted">{text}</p>}
            <div className="mt-3 flex items-center gap-3">
              <Button
                size="sm"
                onClick={() => {
                  setOpen(false);
                  onConfirm();
                }}
              >
                {confirmLabel}
              </Button>
              <Button variant="tertiary" size="sm" onClick={() => setOpen(false)}>
                {cancelLabel}
              </Button>
            </div>
      </MenuLayer>
    </>
  );
}
