"use client";

import { useLayoutEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface AnchoredProps {
  /** The opener – the body sits 8px under it */
  anchor: RefObject<HTMLElement | null>;
  /** "end": right edges flush (the default) · "start": left edges flush */
  align?: "start" | "end";
  /** The body itself, for the opener's outside-click check (it isn't inside the opener's DOM) */
  ref?: RefObject<HTMLDivElement | null>;
  /** "start" only: how wide the body is, so it stays inside the window */
  width?: number;
  className?: string;
  children: ReactNode;
}

/**
 * A popover body rendered into <body>, fixed under its anchor – for openers whose ancestors clip (the fixed site
 * header has overflow hidden). Re-placed on resize and scroll; styling (surface, radius, shadow) stays with the
 * caller's content.
 */
export function Anchored({ anchor, align = "end", ref, width = 0, className, children }: AnchoredProps) {
  const [style, setStyle] = useState<CSSProperties | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (!r) return;
      const top = r.bottom + 8;
      // clientWidth: the viewport without the scrollbar – what fixed `right` measures from.
      setStyle(align === "end" ? { position: "fixed", top, right: Math.max(8, document.documentElement.clientWidth - r.right) } : { position: "fixed", top, left: Math.max(8, Math.min(r.left, document.documentElement.clientWidth - width - 16)) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, align, width]);
  if (!style) return null;
  return createPortal(
    <div ref={ref} data-anchored style={style} className={cn("z-[72]", className)}>
      {children}
    </div>,
    document.body,
  );
}
