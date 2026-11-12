"use client";

import { DEV_SETTINGS_KEY, readDevSetting, subscribeDevSettings } from "./devSettings";
import { useSyncExternalStore } from "react";
import { track } from "./analytics";

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
    track("app_installed", { via: "appinstalled", ref: landingRef() });
  });
}

// ─── Where a visitor came from (?ref=), kept for the session ─────────────────────

const REF_KEY = "simpulo:ref";
function rememberLandingRef() {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && !sessionStorage.getItem(REF_KEY)) sessionStorage.setItem(REF_KEY, ref);
  } catch {
    // storage blocked – no ref then
  }
}
/** The ?ref= this session started with ("footer", "get", "house-qr" …), or null. */
export function landingRef(): string | null {
  try {
    return sessionStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}

/** The first start as an installed app counts as an install too (iOS has no appinstalled event). */
const STANDALONE_SEEN_KEY = "simpulo:standalone-seen";
function noteFirstStandaloneStart() {
  try {
    if (!isStandalone() || localStorage.getItem(STANDALONE_SEEN_KEY)) return;
    localStorage.setItem(STANDALONE_SEEN_KEY, "1");
    track("app_installed", { via: "first_standalone_start", ref: landingRef() });
  } catch {
    // storage blocked
  }
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

/**
 * Where Simpulo is open: iOS Safari, iOS in another browser (Chrome, Firefox, Edge – they can't add to the home screen), Android Chrome,
 * Android in another browser, a computer. "unknown" on the server and during hydration.
 */
export type Browser = "ios-safari" | "ios-other" | "android-chrome" | "android-other" | "desktop" | "unknown";
/** The social apps' own browsers (they can't install anything): open in the real browser instead. */
export type InAppBrowser = "instagram" | "tiktok" | "facebook" | "linkedin" | "snapchat" | null;

function detectInApp(ua: string): InAppBrowser {
  if (/Instagram/i.test(ua)) return "instagram";
  if (/musical_ly|Bytedance|TikTok/i.test(ua)) return "tiktok";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "facebook";
  if (/LinkedInApp/i.test(ua)) return "linkedin";
  if (/Snapchat/i.test(ua)) return "snapchat";
  return null;
}

function detectBrowser(): Browser {
  const ua = navigator.userAgent;
  const platform = detectPlatform();
  if (platform === "ios") return /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//i.test(ua) || detectInApp(ua) ? "ios-other" : "ios-safari";
  if (platform === "android") return /Chrome\//i.test(ua) && !/EdgA|OPR|SamsungBrowser|Firefox/i.test(ua) && !detectInApp(ua) ? "android-chrome" : "android-other";
  return "desktop";
}

export function useBrowser(): Browser {
  return useSyncExternalStore(noSubscribe, detectBrowser, () => "unknown");
}

export function useInAppBrowser(): InAppBrowser {
  return useSyncExternalStore(noSubscribe, () => detectInApp(navigator.userAgent), () => null);
}

/** iPad (iPadOS says "Macintosh") or iPhone – where Safari's Share button sits: top right on the iPad, bottom centre on the iPhone. */
export function useIsIpad(): boolean {
  return useSyncExternalStore(noSubscribe, () => /iPad/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1), () => false);
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

/**
 * True when Simpulo runs as an installed app (home screen), not in a browser tab: display-mode standalone, iOS's navigator.standalone – or the
 * Dev menu's "Simulate installed app". <html> carries the class is-standalone then (STANDALONE_SCRIPT, before the first paint).
 */
export function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia(standaloneQuery).matches || readDevSetting("installedApp");
}

/** For the inline script in app/layout.tsx: is-standalone (and, simulated in dev, sim-standalone) on <html> before anything paints. */
export const STANDALONE_SCRIPT = `try{var h=document.documentElement,s=matchMedia(${JSON.stringify(standaloneQuery)}).matches||navigator.standalone===true,d=false;if(h.getAttribute("data-app-mode")==="dev"){try{d=!!(JSON.parse(localStorage.getItem(${JSON.stringify(DEV_SETTINGS_KEY)})||"{}").installedApp)}catch(e){}}if(s||d)h.classList.add("is-standalone");if(d)h.classList.add("sim-standalone")}catch(e){}`;

function subscribeStandalone(onChange: () => void) {
  const media = window.matchMedia(standaloneQuery);
  const sync = () => {
    document.documentElement.classList.toggle("is-standalone", isStandalone());
    onChange();
  };
  media.addEventListener("change", sync);
  const off = subscribeDevSettings(sync);
  return () => {
    media.removeEventListener("change", sync);
    off();
  };
}

export function useIsStandalone(): boolean {
  return useSyncExternalStore(subscribeStandalone, isStandalone, () => false);
}

// ─── When the install prompt may show ──────────────────────────────────────────────

/** What made the prompt show: the first sent request, an acceptance, a payment that is due. */
export type InstallTrigger = "request" | "accepted" | "payment";

/** At most 3 showings in all, never again after 2 dismissals, at least 3 days apart, never on the first visit. */
export const INSTALL_PROMPT_RULES = { maxShown: 3, maxDismissed: 2, minDaysBetween: 3, minVisits: 2 } as const;

const PROMPT_KEY = "simpulo:install-prompt:v1";
const VISITS_KEY = "simpulo:visits";
const VISIT_SESSION_KEY = "simpulo:visit-counted";

interface PromptLog {
  shown: number;
  dismissed: number;
  lastShownAt: string | null;
}

/** Read and write in try/catch: blocked storage means no prompt at all (better never than every time). Later in the user's profile. */
function readLog(): PromptLog | null {
  try {
    const raw = localStorage.getItem(PROMPT_KEY);
    return raw ? (JSON.parse(raw) as PromptLog) : { shown: 0, dismissed: 0, lastShownAt: null };
  } catch {
    return null;
  }
}
function writeLog(log: PromptLog) {
  try {
    localStorage.setItem(PROMPT_KEY, JSON.stringify(log));
  } catch {
    // blocked
  }
}

/** Counts visits: one per browser session. */
function countVisit() {
  try {
    if (sessionStorage.getItem(VISIT_SESSION_KEY)) return;
    sessionStorage.setItem(VISIT_SESSION_KEY, "1");
    localStorage.setItem(VISITS_KEY, String(Number(localStorage.getItem(VISITS_KEY) ?? 0) + 1));
  } catch {
    // blocked
  }
}
function visits(): number {
  try {
    return Number(localStorage.getItem(VISITS_KEY) ?? 0);
  } catch {
    return 0;
  }
}

/** Whether the install prompt may show now (the rules above). */
export function mayShowInstallPrompt(now = Date.now()): boolean {
  const log = readLog();
  if (!log || visits() < INSTALL_PROMPT_RULES.minVisits) return false;
  if (log.shown >= INSTALL_PROMPT_RULES.maxShown || log.dismissed >= INSTALL_PROMPT_RULES.maxDismissed) return false;
  return !log.lastShownAt || now - Date.parse(log.lastShownAt) >= INSTALL_PROMPT_RULES.minDaysBetween * 86_400_000;
}

export function noteInstallPromptShown(trigger: InstallTrigger) {
  const log = readLog();
  if (log) writeLog({ ...log, shown: log.shown + 1, lastShownAt: new Date().toISOString() });
  track("install_prompt_shown", { trigger, ref: landingRef() });
}

export function noteInstallPromptDismissed(trigger: InstallTrigger) {
  const log = readLog();
  if (log) writeLog({ ...log, dismissed: log.dismissed + 1 });
  track("install_prompt_dismissed", { trigger, ref: landingRef() });
}

// ─── Push, asked only in the installed app ──────────────────────────────────────────

const PUSH_KEY = "simpulo:push-asked";

/**
 * Where push may be offered: the installed app on every device; in a browser tab only on Android and desktop – iOS can only notify an app on
 * the home screen, so a Safari tab gets "Install to get notified" (→ /get) instead.
 */
export function pushAllowedHere(): boolean {
  return "Notification" in window && (isStandalone() || detectPlatform() !== "ios");
}

/** Push is allowed here, nothing decided yet, and our own short sheet wasn't shown in the last 3 days (at most twice). */
export function mayAskForPush(now = Date.now()): boolean {
  try {
    if (!pushAllowedHere() || Notification.permission !== "default") return false;
    const asked = JSON.parse(localStorage.getItem(PUSH_KEY) ?? "null") as { count: number; at: string } | null;
    if (!asked) return true;
    return asked.count < 2 && now - Date.parse(asked.at) >= INSTALL_PROMPT_RULES.minDaysBetween * 86_400_000;
  } catch {
    return false;
  }
}

export function notePushAsked(trigger: InstallTrigger) {
  try {
    const asked = JSON.parse(localStorage.getItem(PUSH_KEY) ?? "null") as { count: number } | null;
    localStorage.setItem(PUSH_KEY, JSON.stringify({ count: (asked?.count ?? 0) + 1, at: new Date().toISOString() }));
  } catch {
    // blocked
  }
  track("push_prompt_shown", { trigger, ref: landingRef() });
}

/** Asks the browser itself – only after the user said yes on our sheet. */
export async function requestPush(trigger: InstallTrigger): Promise<NotificationPermission> {
  const result = await Notification.requestPermission();
  track("push_prompt_answered", { trigger, result });
  return result;
}

// ─── The in-app browser hint, once per session ───────────────────────────────────────

const IN_APP_DISMISSED_KEY = "simpulo:in-app-hint-dismissed";
export function inAppHintDismissed(): boolean {
  try {
    return sessionStorage.getItem(IN_APP_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}
export function dismissInAppHint() {
  try {
    sessionStorage.setItem(IN_APP_DISMISSED_KEY, "1");
  } catch {
    // blocked – it just stays hidden until reload
  }
}

// At the end: everything above (keys, queries) exists by now.
if (typeof window !== "undefined") {
  rememberLandingRef();
  noteFirstStandaloneStart();
  countVisit();
}
