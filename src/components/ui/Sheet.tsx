"use client";

import { ArrowLeft, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ActionButton";
import { IconButton } from "./IconButton";
import { ModalOverlay, modalStack as openSheets } from "./ModalOverlay";
import { PanelSheet, type PanelSheetProps } from "./PanelSheet";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** One muted line under the header, e.g. "Log in to send your request to Tom." */
  subtitle?: string;
  /** Shows a back arrow before the title (multi-step sheets). */
  onBack?: () => void;
  /** Blur and dim everything behind it, trap focus, lock scrolling without a jump (ModalOverlay) */
  focusOverlay?: boolean;
  children: ReactNode;
}

/** A modal's foot: the one action on the right, "Cancel" as a text link on the left. Never full width. */
export function ModalFooter({ onCancel, className, children }: { onCancel?: () => void; className?: string; children: ReactNode }) {
  const t = useTranslations("common");
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {onCancel ? (
        <Button type="button" variant="tertiary" onClick={onCancel} className="-ml-4">
          {t("cancel")}
        </Button>
      ) : (
        <span />
      )}
      {children}
    </div>
  );
}

/**
 * The one sheet. `variant="panel"`: the floating panel at the right, from the bottom on touch (PanelSheet: Filters and what's to
 * come). Without it: a bottom sheet on mobile, a centered modal on desktop.
 */
export function Sheet(props: SheetProps | (PanelSheetProps & { variant: "panel" })) {
  if ("variant" in props) return <PanelSheet {...props} />;
  return <DialogSheet {...props} />;
}

function DialogSheet({ open, onClose, title, subtitle, onBack, focusOverlay = false, children }: SheetProps) {
  const t = useTranslations("common");
  const id = useId();
  const titleId = `${id}-title`;
  // Latest onClose without re-running the effect – otherwise every parent re-render would re-register the
  // sheet and move it to the top of the stack.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    // With the focus overlay, ModalOverlay does all of this (and more).
    if (!open || focusOverlay) return;
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
  }, [open, id, focusOverlay]);

  if (!open) return null;
  const iconSize = "size-5";
  // The same for every modal: 560px, 28px radius, 32px inside, as much below as above.
  const panelClass = "glass-panel scroll-pane relative max-h-[90dvh] w-full rounded-b-none p-8 pb-[max(2rem,env(safe-area-inset-bottom))] md:max-w-[560px] md:rounded-b-[28px]";

  const content = (
    <>
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line md:hidden" />
      <div className={cn("flex items-center justify-between gap-4", !subtitle && "mb-4")}>
        <div className="flex min-w-0 items-center gap-1">
          {onBack && (
            <IconButton size="sm" onClick={onBack} aria-label={t("back")} className="-ml-2">
              <ArrowLeft className={iconSize} />
            </IconButton>
          )}
          <h2 id={titleId} className="truncate text-body-lg font-semibold">
            {title}
          </h2>
        </div>
        <IconButton size="sm" onClick={onClose} aria-label={t("close")} className="-mr-2">
          <X className={iconSize} />
        </IconButton>
      </div>
      {subtitle && <p className="mb-6 mt-1 text-body text-muted">{subtitle}</p>}
      <div data-sheet-body>{children}</div>
    </>
  );

  if (focusOverlay) {
    return (
      // Focus starts on the sheet's first action (e.g. "Continue with Apple"), not on the close button.
      <ModalOverlay open onClose={onClose} labelledBy={titleId} panelClassName={panelClass} initialFocus="[data-sheet-body]">
        {content}
      </ModalOverlay>
    );
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="modal-backdrop absolute inset-0"
      />
      <div className={cn("animate-sheet-in", panelClass)}>{content}</div>
    </div>
  );
}
