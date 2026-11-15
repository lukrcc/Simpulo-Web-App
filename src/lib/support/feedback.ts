"use client";

// Support in two ways (components/help/HelpFeedback.tsx, mounted once in AppShell): "Get help" (openGetHelp) and "Share an idea"
// (openShareIdea). Both land in Admin › Support as tickets (lib/admin/store.ts addSupportTicket).
import { useSyncExternalStore } from "react";
import type { PlatformPhase, TicketContext } from "@/lib/types";

/** Which support sheet is open: "Get help" (question, something's broken, safety) or "Share an idea"; null = none. */
export type SupportSheet = "help" | "idea";
let open: SupportSheet | null = null;
/** What "Get help" opens with, from where it was opened: the House it's about, "safety" for a report. */
export interface HelpPrefill {
  houseId?: string;
  category?: "question" | "bug" | "safety";
}
let prefill: HelpPrefill = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/**
 * "Get help" – the help sheet, from anywhere; with context where there is one (help always in context): the House (house page, chat),
 * Safety for a report. Called as an onClick handler too – a click event is not a prefill.
 */
export function openGetHelp(context?: HelpPrefill | Event | { nativeEvent: unknown }) {
  prefill = context && !("nativeEvent" in context) && !(context instanceof Event) ? context : {};
  open = "help";
  emit();
}

/** The prefill the open help sheet started with. */
export const helpPrefill = (): HelpPrefill => prefill;

/** "Share an idea" – the light idea sheet; saved as a ticket with category "idea" (Admin › Support › Ideen). */
export function openShareIdea() {
  prefill = {};
  open = "idea";
  emit();
}

export function closeSupportSheet() {
  open = null;
  emit();
}

export function useSupportSheet(): SupportSheet | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
    () => null,
  );
}

/** "iPhone · Safari", "Desktop · Chrome" – from the browser, for the ticket's context (no fingerprinting beyond this). */
export function deviceLabel(): string {
  const ua = navigator.userAgent;
  const device = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "iPad" : /iPhone/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : "Desktop";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${device} · ${browser}`;
}

/** What goes along with a ticket – shown to the person before they send it. Only in the browser. */
export function ticketContext(phase: PlatformPhase, houseId?: string): TicketContext {
  return { page: window.location.pathname + window.location.search, houseId, device: deviceLabel(), screenWidth: window.innerWidth, phase };
}
