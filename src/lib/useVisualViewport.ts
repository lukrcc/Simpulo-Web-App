"use client";

import { useEffect } from "react";

/**
 * Phones: the visual viewport's top and height on <html> (--vv-top, --vv-h) – the part of the window the on-screen keyboard leaves – and
 * how much of the window's bottom the keyboard covers (--vv-kb). A full-height sheet (ui/Sheet) or the chat page sits exactly in the visible
 * part; a fixed foot (Open a House's "Next") stands --vv-kb above the bottom – never under the keyboard. Removed again when inactive.
 */
export function useVisualViewport(active: boolean) {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;
    const root = document.documentElement;
    const write = () => {
      root.style.setProperty("--vv-top", `${vv.offsetTop}px`);
      root.style.setProperty("--vv-h", `${vv.height}px`);
      root.style.setProperty("--vv-kb", `${Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))}px`);
    };
    write();
    vv.addEventListener("resize", write);
    vv.addEventListener("scroll", write);
    return () => {
      vv.removeEventListener("resize", write);
      vv.removeEventListener("scroll", write);
      root.style.removeProperty("--vv-top");
      root.style.removeProperty("--vv-h");
      root.style.removeProperty("--vv-kb");
    };
  }, [active]);
}
