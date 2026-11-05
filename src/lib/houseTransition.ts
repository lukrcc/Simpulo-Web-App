"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";
import { placeShelves, shelfPositions } from "@/lib/shelves";

/*
 * Card → House page and back: a plain navigation with a short fade. The way back also restores the page it left: scroll,
 * carousel rows, the Spotlight's card. Reduced motion: no fade.
 */

const FADE_MS = 150;
/** The way back: the page's own effects (the Spotlight's Embla) run before the positions are set. */
const RESTORE_SETTLE_MS = 80;

interface Origin {
  path: string;
  scrollY: number;
  /** Each carousel row's horizontal position, in page order */
  rows: number[];
}

let origin: Origin | null = null;
let spotlightIndex: number | null = null;
let goingBack = false;

function fadeInPage() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelector("main")?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, easing: "cubic-bezier(0.32, 0.72, 0, 1)" });
}

/** A House card's Link, `onNavigate`: remembers where the page was. */
export function rememberOrigin() {
  origin = { path: window.location.pathname, scrollY: window.scrollY, rows: shelfPositions() };
}

/** Leave the House page the way it was reached: back in history, or to Explore if it was opened directly. */
function leaveHouse(router: ReturnType<typeof useRouter>) {
  if (window.history.length > 1) router.back();
  else router.push("/");
}

/** The House page: fades in when a card opened it (not on a direct load, it's already painted); Escape goes back. */
export function useHouseStage() {
  const router = useRouter();
  useLayoutEffect(() => {
    if (origin) fadeInPage();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || document.querySelector('[role="dialog"]')) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]")) return;
      leaveHouse(router);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
}

/** The Spotlight's card: kept here, so coming back finds the same one. */
export const rememberSpotlight = (index: number) => {
  spotlightIndex = index;
};
export const rememberedSpotlight = () => spotlightIndex;

/**
 * Marks the way back, however it's triggered (browser, Escape, back button), so a link to the same page doesn't restore
 * anything. React renders a popstate's update right after the listener that caused it, so this has to run before the
 * router's: a small script registers before hydration (next/script, beforeInteractive) and calls this (HOUSE_BACK_GATE).
 */
function onPopState() {
  if (origin && window.location.pathname === origin.path) goingBack = true;
}
if (typeof window !== "undefined") (window as unknown as { __housePop?: typeof onPopState }).__housePop = onPopState;

/** Back on the page the card was on: the scroll and carousel positions. */
export function restoreOrigin(pathname: string) {
  if (!goingBack || !origin || origin.path !== pathname) return;
  const { scrollY, rows } = origin;
  goingBack = false;
  origin = null;
  const place = () => {
    window.scrollTo({ top: scrollY, behavior: "instant" });
    placeShelves(rows);
  };
  fadeInPage();
  place();
  setTimeout(place, RESTORE_SETTLE_MS);
}
