"use client";

import { useSyncExternalStore } from "react";

export type Platform = "ios" | "android" | "desktop" | "unknown";

/** Chrome's install prompt event – not part of the standard DOM typings. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// The event fires once, early, on any page. Catch it at module load (this module is imported from the root
// layout) so /install can still use it after a client-side navigation.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();
const notifyPrompt = () => promptListeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // we show our own button instead of Chrome's mini-infobar
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifyPrompt();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notifyPrompt();
  });
}

function subscribePrompt(listener: () => void) {
  promptListeners.add(listener);
  return () => promptListeners.delete(listener);
}

export function useInstallPrompt(): BeforeInstallPromptEvent | null {
  return useSyncExternalStore(subscribePrompt, () => deferredPrompt, () => null);
}

/** Forget the prompt once it has been used – Chrome only allows calling prompt() once per event. */
export function clearInstallPrompt() {
  deferredPrompt = null;
  notifyPrompt();
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac – tell it apart by touch support.
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

const noSubscribe = () => () => {};

/** "unknown" during server rendering and hydration, the real platform afterwards. */
export function usePlatform(): Platform {
  return useSyncExternalStore(noSubscribe, detectPlatform, () => "unknown");
}

const standaloneQuery = "(display-mode: standalone)";

/** True when Simpulo runs as an installed app (home screen), not in a browser tab. */
export function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia(standaloneQuery).matches;
}

function subscribeStandalone(onChange: () => void) {
  const media = window.matchMedia(standaloneQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function useIsStandalone(): boolean {
  return useSyncExternalStore(subscribeStandalone, isStandalone, () => false);
}
