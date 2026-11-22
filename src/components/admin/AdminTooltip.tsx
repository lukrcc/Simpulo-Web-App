"use client";

// The admin's ONE tooltip (CLAUDE.md "Admin-Tooltips nur über AdminTooltip, groß und Creme"), mounted once in AdminFrame. On admin pages it
// takes over from the app's Tooltip (ui/Tooltip.tsx stays out while an .admin-scope is on the page): every ⓘ, the tab capsules'
// explanations (data-tooltip-info), the timeline's bands, diamonds and star, tiles, table heads and icon buttons (aria-label). Large and
// friendly: warm cream, dark warm words (≈ 18–19px, line-height 1.5), an optional bold title (data-tooltip-title, ≈ 20px), a fine apricot edge,
// a soft shadow and a small arrow to the element; up to 440px wide, never cut at the window's edges (it flips above/below and slides
// sideways). After ≈ 150ms of hover; it stays while the pointer is on the element or on the tooltip (its text can be selected); Escape,
// a click elsewhere or scrolling closes it. Touch (tablets): a tap on an ⓘ opens and closes it (AdminNumbers InfoTip, same look); a long
// press shows an explanation on a capsule. The charts' hover boxes use the same look (AdminTooltipBox).
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/** The wait before it appears. */
const DELAY_MS = 150;
/** Moving from the element to the tooltip (or back) may cross this gap without closing it. */
const GRACE_MS = 120;
/** Distance to the element and to the window's edges. */
const GAP = 10;
const EDGE = 12;
/** Icon buttons are small: anything bigger with only an aria-label is a card or an overlay, not a control. */
const MAX_SIZE = 56;
const LONG_PRESS_MS = 500;
const TOUCH_SHOW_MS = 6000;

const CANDIDATE = "[data-tooltip-info], [data-tooltip], button[aria-label], a[aria-label], [role=button][aria-label], [role=img][aria-label]";

/** The class of every admin tooltip surface (styles/admin-tokens.css .admin-tooltip). */
export const ADMIN_TOOLTIP = "admin-tooltip";

function hasVisibleText(el: Element): boolean {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    const parent = node.parentElement?.getBoundingClientRect();
    if (parent && (parent.width <= 1 || parent.height <= 1)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const box = range.getBoundingClientRect();
    if (box.width > 1 && box.height > 1) return true;
  }
  return false;
}

/** The text (and optional title) for an element, or null – the same rules as the app's Tooltip. */
function contentFor(el: HTMLElement): { title: string | null; text: string } | null {
  if (el.hasAttribute("data-no-tooltip") || el.getAttribute("aria-hidden") === "true") return null;
  const title = el.getAttribute("data-tooltip-title");
  const info = el.getAttribute("data-tooltip-info");
  if (info) return { title, text: info };
  const explicit = el.getAttribute("data-tooltip");
  if (!explicit) {
    if (el.getAttribute("tabindex") === "-1") return null;
    const box = el.getBoundingClientRect();
    if (el.getAttribute("role") !== "img" && (box.width > MAX_SIZE || box.height > MAX_SIZE || el.querySelector("img"))) return null;
    if (hasVisibleText(el)) return null;
  }
  const text = explicit || el.getAttribute("aria-label");
  return text ? { title, text } : null;
}

/** Where the box goes: under the element (above when the window ends), centred and kept inside the window; the arrow points at the element. */
export function placeTooltip(anchor: DOMRect, box: { width: number; height: number }) {
  const below = anchor.bottom + GAP + box.height <= window.innerHeight - EDGE || anchor.top - GAP - box.height < EDGE;
  const centre = anchor.left + anchor.width / 2;
  const left = Math.min(Math.max(EDGE, centre - box.width / 2), document.documentElement.clientWidth - EDGE - box.width);
  const top = below ? anchor.bottom + GAP : anchor.top - GAP - box.height;
  return { left, top, below, arrow: Math.min(Math.max(16, centre - left), box.width - 16) };
}

/** The look of every admin tooltip: cream surface, title, text, the arrow. Used by the hover tooltip, the ⓘ on touch and the charts. */
export function AdminTooltipBox({ title, children, arrow, className, style, boxRef, interactive = false }: { title?: string | null; children: ReactNode; arrow?: { x: number; below: boolean } | null; className?: string; style?: React.CSSProperties; boxRef?: React.Ref<HTMLDivElement>; interactive?: boolean }) {
  return (
    <div ref={boxRef} role="tooltip" data-admin-tooltip className={cn(ADMIN_TOOLTIP, !interactive && "pointer-events-none", className)} style={style}>
      {arrow && <span aria-hidden className="admin-tooltip-arrow" data-below={arrow.below || undefined} style={{ left: arrow.x }} />}
      {title && <p className="admin-tooltip-title">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

export function AdminTooltip() {
  const [tip, setTip] = useState<{ title: string | null; text: string; anchor: HTMLElement } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<ReturnType<typeof placeTooltip> | null>(null);

  // Mouse: after DELAY_MS; it stays while the pointer is on the element or the tooltip.
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let closer: ReturnType<typeof setTimeout> | undefined;
    let current: HTMLElement | null = null;
    const hide = () => {
      clearTimeout(timer);
      clearTimeout(closer);
      current = null;
      setTip(null);
    };
    const inBox = (node: Node | null) => Boolean(node && boxRef.current?.contains(node));
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const target = e.target as Element | null;
      if (inBox(target)) return clearTimeout(closer);
      const el = target?.closest<HTMLElement>(CANDIDATE);
      if (el === current) return clearTimeout(closer);
      if (!el) return;
      const content = contentFor(el);
      if (!content) return;
      clearTimeout(timer);
      clearTimeout(closer);
      current = el;
      timer = setTimeout(() => current === el && setTip({ ...content, anchor: el }), DELAY_MS);
    };
    const onOut = (e: PointerEvent) => {
      if (!current) return;
      const to = e.relatedTarget as Node | null;
      if (to && (current.contains(to) || inBox(to))) return;
      clearTimeout(closer);
      closer = setTimeout(hide, GRACE_MS);
    };
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (!el.matches?.(":focus-visible")) return;
      const anchor = el.closest<HTMLElement>(CANDIDATE);
      const content = anchor && contentFor(anchor);
      if (anchor && content) {
        current = anchor;
        setTip({ ...content, anchor });
      }
    };
    const onDown = (e: PointerEvent) => !inBox(e.target as Node) && hide();
    const onBlur = (e: FocusEvent) => !inBox(e.relatedTarget as Node) && hide();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("focusout", onBlur, true);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      clearTimeout(closer);
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerout", onOut, true);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("focusout", onBlur, true);
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Touch: a long press on an explanation (data-tooltip-info – a capsule, a band) shows it; the release after it is no click.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let swallowUntil = 0;
    const close = () => {
      clearTimeout(hideTimer);
      setTip((t) => (t ? null : t));
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      if (boxRef.current?.contains(e.target as Node)) return;
      close();
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-tooltip-info]");
      const text = el?.getAttribute("data-tooltip-info");
      if (!el || !text) return;
      timer = setTimeout(() => {
        swallowUntil = performance.now() + 800;
        setTip({ title: el.getAttribute("data-tooltip-title"), text, anchor: el });
        hideTimer = setTimeout(close, TOUCH_SHOW_MS);
      }, LONG_PRESS_MS);
    };
    const cancel = () => clearTimeout(timer);
    const onClick = (e: MouseEvent) => {
      if (performance.now() > swallowUntil) return;
      swallowUntil = 0;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", cancel, true);
    document.addEventListener("pointercancel", cancel, true);
    document.addEventListener("pointermove", cancel, true);
    document.addEventListener("click", onClick, true);
    return () => {
      cancel();
      clearTimeout(hideTimer);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", cancel, true);
      document.removeEventListener("pointercancel", cancel, true);
      document.removeEventListener("pointermove", cancel, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!tip || !box) return setPlace(null);
    setPlace(placeTooltip(tip.anchor.getBoundingClientRect(), { width: box.offsetWidth, height: box.offsetHeight }));
  }, [tip]);

  if (!tip) return null;
  return createPortal(
    <AdminTooltipBox
      boxRef={boxRef}
      interactive
      title={tip.title}
      arrow={place ? { x: place.arrow, below: place.below } : null}
      className="fixed z-[90] animate-fade-in"
      style={{ left: place?.left ?? -9999, top: place?.top ?? -9999 }}
    >
      {tip.text}
    </AdminTooltipBox>,
    document.body,
  );
}
