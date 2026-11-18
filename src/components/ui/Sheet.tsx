"use client";

import { ArrowLeft, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ActionButton";
import { IconButton } from "./IconButton";
import { ModalOverlay, modalStack as openSheets, lockScroll } from "./ModalOverlay";
import { PanelSheet, type PanelSheetProps } from "./PanelSheet";
import { createPortal } from "react-dom";

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
  /** Above the title, top left; the X stays top right. With it the title is large and wraps. */
  lead?: ReactNode;
  /** The large head (h2 title that wraps) without anything above it – the auth sheet */
  large?: boolean;
  /** What the title shows instead of the plain text (e.g. with an orange dot); `title` stays its accessible name. */
  titleNode?: ReactNode;
  /** Two columns' room (the pay sheet): 820px from md, 28px inside; on phones the full height */
  wide?: boolean;
  /** Phones: the full height (the request) – a fixed head, the body scrolling, the foot (PHONE_FOOTER) above the safe area and the keyboard */
  fullOnPhone?: boolean;
  children: ReactNode;
}

/**
 * Phones, in a full-height sheet (fullOnPhone, wide): the foot with the main action stays at the bottom of the sheet – over the safe area,
 * and with the keyboard open over the keyboard (the sheet follows the visual viewport). Give it to the foot's className.
 */
export const PHONE_FOOTER = "max-md:sticky max-md:bottom-0 max-md:z-10 max-md:mt-auto max-md:bg-(--glass-solid) max-md:pt-3 max-md:pb-[max(1rem,var(--safe-bottom))]";

/** How many dialogs are open: while any is, html[data-dialog-open] (the tab bar steps back). */
let openDialogs = 0;

/**
 * Phones with a full-height sheet open: the visual viewport's top and height on <html> (--vv-top, --vv-h) – the part of the window the
 * keyboard leaves. The sheet sits exactly there, so its foot (the main action) is never under the keyboard.
 */
function useVisualViewport(active: boolean) {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;
    const root = document.documentElement;
    const write = () => {
      root.style.setProperty("--vv-top", `${vv.offsetTop}px`);
      root.style.setProperty("--vv-h", `${vv.height}px`);
    };
    write();
    vv.addEventListener("resize", write);
    vv.addEventListener("scroll", write);
    return () => {
      vv.removeEventListener("resize", write);
      vv.removeEventListener("scroll", write);
      root.style.removeProperty("--vv-top");
      root.style.removeProperty("--vv-h");
    };
  }, [active]);
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

function DialogSheet({ open, onClose, title, subtitle, onBack, focusOverlay = false, lead, large = false, titleNode, wide = false, fullOnPhone = false, children }: SheetProps) {
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
    // The one counted lock (ModalOverlay): released on close and unmount, nested sheets can't leave it on.
    const unlock = lockScroll();
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
      openSheets.splice(openSheets.indexOf(id), 1);
    };
  }, [open, id, focusOverlay]);

  // While a dialog is open the tab bar steps back (html[data-dialog-open], globals.css): requests, payments and login are flows of their own.
  useEffect(() => {
    if (!open) return;
    openDialogs += 1;
    document.documentElement.setAttribute("data-dialog-open", "");
    return () => {
      openDialogs -= 1;
      if (openDialogs === 0) document.documentElement.removeAttribute("data-dialog-open");
    };
  }, [open]);
  const full = wide || fullOnPhone;
  useVisualViewport(open && full);

  if (!open) return null;
  const iconSize = "size-5";
  // The same for every modal: 560px, 28px radius, 32px inside, as much below as above.
  // Phones, full height (wide, fullOnPhone): exactly the visual viewport (the wrapper below), the head sticky at the top, 0 padding at the
  // bottom (the foot carries the safe area itself, PHONE_FOOTER).
  const panelClass = wide
    ? "glass-panel scroll-pane relative w-full rounded-b-none p-7 pb-[max(1.75rem,var(--safe-bottom))] max-md:flex max-md:h-full max-md:max-h-full max-md:flex-col max-md:rounded-none max-md:pb-0 max-md:pt-0 md:h-auto md:max-h-[90dvh] md:max-w-[820px] md:rounded-b-[28px]"
    : fullOnPhone
      ? "glass-panel scroll-pane relative w-full rounded-b-none p-8 pb-[max(2rem,var(--safe-bottom))] max-md:flex max-md:h-full max-md:max-h-full max-md:flex-col max-md:rounded-none max-md:px-5 max-md:pb-0 max-md:pt-0 md:max-h-[90dvh] md:max-w-[560px] md:rounded-b-[28px]"
      : "glass-panel scroll-pane relative max-h-[90dvh] w-full rounded-b-none p-8 pb-[max(2rem,var(--safe-bottom))] md:max-w-[560px] md:rounded-b-[28px]";
  // The sticky head on phones in a full-height sheet: the panel's own glass behind it, reaching to its sides.
  const stickyHead = full && (wide ? "max-md:-mx-7 max-md:px-7" : "max-md:-mx-5 max-md:px-5");

  const content = lead || large ? (
    <>
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line md:hidden" />
      {/* The large head: the lead (app icon) top left, the X top right, the title under the lead, the line under it. */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {lead}
          <h2 id={titleId} aria-label={title} className={cn("text-h2 font-bold text-ink", Boolean(lead) && "mt-4")}>
            {titleNode ?? title}
          </h2>
        </div>
        <IconButton size="sm" onClick={onClose} aria-label={t("close")} className="-mr-2 -mt-1">
          <X className={iconSize} />
        </IconButton>
      </div>
      {subtitle && <p className="mt-1 text-body text-muted">{subtitle}</p>}
      <div data-sheet-body className="mt-8">
        {children}
      </div>
    </>
  ) : (
    <>
      <div className={cn(full && cn("max-md:sticky max-md:top-0 max-md:z-10 max-md:shrink-0 max-md:bg-(--glass-solid) max-md:pt-3", stickyHead))}>
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
      </div>
      {subtitle && <p className="mb-6 mt-1 text-body text-muted">{subtitle}</p>}
      {/* Full height on phones: the body takes the rest of the sheet, so a form inside can put its foot at the bottom (mt-auto). */}
      <div data-sheet-body className={cn(full && "max-md:flex max-md:flex-[1_0_auto] max-md:flex-col")}>
        {children}
      </div>
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

  // Into <body>: a sheet opened from inside a card (backdrop-filter, transform) would otherwise be fixed to that card – cut off,
  // with the page's scrolling locked behind it.
  return createPortal(
    <div
      className={cn("fixed inset-0 z-[75] flex items-end justify-center md:items-center", full && "max-md:bottom-auto max-md:top-(--vv-top,0px) max-md:h-(--vv-h,100dvh)")}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="modal-backdrop absolute inset-0"
      />
      <div data-dialog-panel className={cn("animate-sheet-in", panelClass)}>{content}</div>
    </div>,
    document.body,
  );
}
