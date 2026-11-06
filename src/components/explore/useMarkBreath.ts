"use client";

import { useEffect, useRef } from "react";
import { isSeen, prefersReducedMotion } from "./FlipText";

/** On layouts without the entrance nobody says it's over. */
const INTRO_FAILSAFE_MS = 3_000;
const FIRST_MS = 1_000;
const EVERY_MS = 9_000;
/** A hover breathes again at most this often, counted from the last breath. */
const HOVER_COOLDOWN_MS = 3_000;

let introDone = false;
const introListeners = new Set<() => void>();
/** The Spotlight's entrance is over, or there wasn't one. */
export function markSpotlightIntroDone() {
  introDone = true;
  introListeners.forEach((run) => run());
  introListeners.clear();
}

/** In, then out with a little overshoot: 380ms down to 0.72, 520ms back up past 1 and settling. */
const BREATH: Keyframe[] = [
  { transform: "scale(1)", opacity: 1, easing: "ease-in", offset: 0 },
  { transform: "scale(0.72)", opacity: 0.6, easing: "ease-out", offset: 380 / 900 },
  { transform: "scale(1.08)", opacity: 1, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", offset: (380 + 220) / 900 },
  { transform: "scale(1)", opacity: 1, offset: 1 },
];

/**
 * The "?" of a stage headline takes a breath: 1s after the entrance, then every 9s, and when the mouse comes over the line. Not tied to the carousel.
 * Pauses out of the window and in a background tab; never with reduced motion. The headline doesn't take the pointer (the carousel's drag area is around
 * it), so the mouse is compared with its box.
 */
export function useMarkBreath() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    const mark = el?.querySelector<HTMLElement>("[data-mark]");
    if (!el || !mark || prefersReducedMotion()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let started = false;
    let onScreen = false;
    let breathing = false;
    let last = -HOVER_COOLDOWN_MS;
    let inside = false;
    let breathed = false;

    const breathe = () => {
      if (breathing || !isSeen(el)) return;
      breathing = true;
      breathed = true;
      last = performance.now();
      mark.style.willChange = "transform, opacity";
      void mark
        .animate(BREATH, { duration: 900 })
        .finished.catch(() => {})
        .then(() => {
          breathing = false;
          mark.style.willChange = "";
        });
      schedule(EVERY_MS);
    };
    const schedule = (wait: number) => {
      clearTimeout(timer);
      timer = undefined;
      if (!started || !onScreen || document.hidden) return;
      timer = setTimeout(breathe, wait);
    };
    // The first one 1s after the entrance, also when the line only comes into view later.
    const resume = () => schedule(breathed ? EVERY_MS : FIRST_MS);

    const arrive = () => {
      clearTimeout(failsafe);
      started = true;
      resume();
    };
    const failsafe = setTimeout(markSpotlightIntroDone, INTRO_FAILSAFE_MS);
    if (introDone) arrive();
    else introListeners.add(arrive);

    const observer = new IntersectionObserver(([entry]) => {
      const was = onScreen;
      onScreen = entry.isIntersecting;
      if (onScreen && !was && timer === undefined) resume();
      if (!onScreen) schedule(EVERY_MS);
    });
    observer.observe(el);
    const onVisibility = () => (document.hidden ? schedule(EVERY_MS) : resume());
    document.addEventListener("visibilitychange", onVisibility);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const box = el.getBoundingClientRect();
      const over = e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom;
      if (over && !inside && started && performance.now() - last >= HOVER_COOLDOWN_MS) breathe();
      inside = over;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      clearTimeout(timer);
      clearTimeout(failsafe);
      introListeners.delete(arrive);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
  return ref;
}
