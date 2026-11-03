"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, type CSSProperties, type RefObject } from "react";
import { placeShelves, shelfPositions } from "@/lib/shelves";

/*
 * Card → House page and back, with the View Transitions API. Image, title and host tab share a name per House. On the
 * House page they are always set (one House per document); on a card only while it's the one clicked, because the same
 * House can show twice on Explore and names must be unique. No API or reduced motion: plain navigation.
 * Timing: globals.css (::view-transition-*).
 */

/** The new page has this long to appear before the transition goes on without it. */
const MAX_WAIT_MS = 1500;
/** How long a frozen frame may wait for the stage's image, so the morph doesn't land on an empty frame. */
const IMAGE_WAIT_MS = 350;
/** The way back: the page's own effects (the Spotlight's Embla) run before the card is looked up. */
const RESTORE_SETTLE_MS = 80;
/** A view-transition class, so the image's corners stay rounded (Safari from 18.2; before that they're square in flight). */
const IMAGE_CLASS = "house-image";

type Part = "image" | "title" | "host";

interface Origin {
  path: string;
  stayId: string;
  scrollY: number;
  /** Each carousel row's horizontal position, in page order */
  rows: number[];
}

let origin: Origin | null = null;
let settle: (() => void) | null = null;
let spotlightIndex: number | null = null;
let goingBack = false;
let clearBack: (() => void) | null = null;

const canAnimate = () => typeof document.startViewTransition === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const partName = (part: Part, stayId: string) => `house-${part}-${stayId}`;

/** The names for the House page's image, title and host tab. */
export function stageTransition(part: Part, stayId: string): CSSProperties {
  return { viewTransitionName: partName(part, stayId), ...(part === "image" && { viewTransitionClass: IMAGE_CLASS }) } as CSSProperties;
}

/** Names one card for the transition; returns how to take them off again. */
function nameCard(card: Element, stayId: string): () => void {
  const parts: [Part, Element | null][] = [
    ["image", card.querySelector('[data-vt="image"]')],
    ["title", card.querySelector('[data-vt="title"]')],
    ["host", card.querySelector("[data-card-tab]")],
  ];
  const named = parts.filter((p): p is [Part, HTMLElement] => p[1] instanceof HTMLElement);
  for (const [part, el] of named) {
    el.style.setProperty("view-transition-name", partName(part, stayId));
    if (part === "image") el.style.setProperty("view-transition-class", IMAGE_CLASS);
  }
  return () => {
    for (const [, el] of named) {
      el.style.removeProperty("view-transition-name");
      el.style.removeProperty("view-transition-class");
    }
  };
}

function untilSettled(): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      settle = null;
      resolve();
    };
    const timer = setTimeout(done, MAX_WAIT_MS);
    settle = done;
  });
}

function rememberOrigin(stayId: string) {
  origin = { path: window.location.pathname, stayId, scrollY: window.scrollY, rows: shelfPositions() };
}

/** A House card's Link: `onNavigate` for it. Remembers where the page was and, where possible, runs the navigation in a transition. */
export function useHouseNavigate(stayId: string, href: string, cardRef: RefObject<Element | null>) {
  const router = useRouter();
  return (event: { preventDefault: () => void }) => {
    rememberOrigin(stayId);
    const card = cardRef.current;
    if (!card || !canAnimate()) return;
    event.preventDefault();
    const clear = nameCard(card, stayId);
    const transition = document.startViewTransition(() => {
      const arrived = untilSettled();
      router.push(href);
      return arrived;
    });
    void transition.finished.finally(clear);
  };
}

/** Leave the House page the way it was reached: back in history, or to Explore if it was opened directly. */
function leaveHouse(router: ReturnType<typeof useRouter>) {
  if (window.history.length > 1) router.back();
  else router.push("/");
}

/** The House page: tells the waiting transition it's there (once its image can be shown); Escape goes back. */
export function useHouseStage() {
  const router = useRouter();
  useLayoutEffect(() => {
    const done = settle;
    if (!done) return;
    const image = [...document.querySelectorAll<HTMLImageElement>("[data-house-stage-image] img")].find((img) => img.getBoundingClientRect().width > 0);
    void Promise.race([image?.decode().catch(() => undefined) ?? Promise.resolve(), new Promise((r) => setTimeout(r, IMAGE_WAIT_MS))]).then(done);
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

/** The House page is showing (it may also sit hidden behind Explore, kept by the router). */
const stageShows = () => [...document.querySelectorAll("[data-house-stage-image]")].some((el) => el.getBoundingClientRect().width > 0);

let replaying = false;

/**
 * The way back, however it's triggered (browser, Escape, back button): starts the transition while the House page is still
 * showing, and only then hands the event on to Next.js. React renders a popstate's update right after the listener that
 * caused it, so this has to run first. Neither loading this module nor the capture phase is early enough: the router's
 * listener runs first. So a small script registers before hydration (next/script, beforeInteractive) and calls this
 * (HOUSE_BACK_GATE). The browser's own swipe-back animation (Safari) replaces ours.
 */
function onPopState(event: PopStateEvent) {
  if (replaying || !origin || window.location.pathname !== origin.path || !stageShows()) return;
  goingBack = true;
  if (!canAnimate() || (event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition) return;
  event.stopImmediatePropagation();
  const { state } = event;
  const transition = document.startViewTransition(() => {
    const arrived = untilSettled();
    replaying = true;
    window.dispatchEvent(new PopStateEvent("popstate", { state }));
    replaying = false;
    return arrived;
  });
  void transition.finished.finally(() => {
    clearBack?.();
    clearBack = null;
  });
}
if (typeof window !== "undefined") (window as unknown as { __housePop?: typeof onPopState }).__housePop = onPopState;

/** Back on the page the card was on: the scroll and carousel positions, then the card takes the names again. */
export function restoreOrigin(pathname: string) {
  if (!goingBack || !origin || origin.path !== pathname) return;
  const { scrollY, rows, stayId } = origin;
  goingBack = false;
  origin = null;
  const place = () => {
    window.scrollTo({ top: scrollY, behavior: "instant" });
    placeShelves(rows);
  };
  place();
  setTimeout(() => {
    place();
    const card = [...document.querySelectorAll(`[data-house-card="${stayId}"]`)].find((el) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight && box.right > 0 && box.left < window.innerWidth;
    });
    if (card && settle) clearBack = nameCard(card, stayId);
    settle?.();
  }, RESTORE_SETTLE_MS);
}
