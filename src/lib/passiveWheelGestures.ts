"use client";

import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";

type Plugin = ReturnType<typeof WheelGesturesPlugin>;

/**
 * Sideways wheel for Embla carousels (Spotlight, every <Shelf>) without ever holding up the page's own scrolling.
 *
 * Embla's WheelGesturesPlugin listens with `passive: false` on the carousel. Then the browser has to wait for the main thread
 * on every wheel event over the carousel – with a mouse wheel each notch is its own cancelable event, so the page scrolled
 * in jerks wherever a carousel sat under the pointer (a trackpad only blocks on the first event of a gesture).
 *
 * Here the plugin listens on a detached element instead, and the carousel's real listener is passive: it hands on only
 * movements that are mostly sideways (a trackpad swipe, Shift + wheel). A vertical turn is never touched – the page scrolls.
 * While the pointer is over a carousel, the page's horizontal overscroll is off, so a sideways swipe moves the carousel
 * instead of going back in the browser's history (what the plugin's preventDefault used to stop).
 */
export function PassiveWheelGestures(): Plugin {
  const proxy = typeof document === "undefined" ? undefined : document.createElement("div");
  const inner = WheelGesturesPlugin({ target: proxy });
  let detach = () => {};
  return {
    ...inner,
    init(embla, optionsHandler) {
      inner.init(embla, optionsHandler);
      const viewport = embla.rootNode();
      if (!proxy) return;
      const root = document.documentElement;
      const onWheel = (e: WheelEvent) => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        proxy.dispatchEvent(new WheelEvent("wheel", e));
      };
      const guard = () => root.style.setProperty("overscroll-behavior-x", "none");
      const release = () => root.style.removeProperty("overscroll-behavior-x");
      viewport.addEventListener("wheel", onWheel, { passive: true });
      viewport.addEventListener("pointerenter", guard);
      viewport.addEventListener("pointerleave", release);
      detach = () => {
        viewport.removeEventListener("wheel", onWheel);
        viewport.removeEventListener("pointerenter", guard);
        viewport.removeEventListener("pointerleave", release);
        release();
      };
    },
    destroy() {
      detach();
      inner.destroy();
    },
  };
}
