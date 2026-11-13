"use client";

// "Help & feedback": the one sheet (components/help/HelpFeedback.tsx, mounted once in AppShell) opens from anywhere through
// openHelpFeedback(); what it sends goes to the admin collections (lib/admin/store.ts addSupportTicket).
import { useSyncExternalStore } from "react";
import type { PlatformPhase, TicketContext } from "@/lib/types";

let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function openHelpFeedback() {
  open = true;
  emit();
}

export function closeHelpFeedback() {
  open = false;
  emit();
}

export function useHelpFeedbackOpen(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
    () => false,
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
