"use client";

import { useSyncExternalStore } from "react";

/**
 * Messages from 744px (CLAUDE.md "Messages: Chat als schwebende Karte"): whether the chat list is folded away. Kept for the session
 * (sessionStorage, try/catch); the server and the first render say "open" (Regel Hydration).
 */
const KEY = "simpulo:messages:list-collapsed";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setListCollapsed(collapsed: boolean) {
  try {
    if (collapsed) sessionStorage.setItem(KEY, "1");
    else sessionStorage.removeItem(KEY);
  } catch {
    /* private mode – the state lives only in this page */
  }
  memory = collapsed;
  listeners.forEach((fn) => fn());
}

let memory: boolean | null = null;

export function useListCollapsed(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => memory ?? (memory = read()),
    () => false,
  );
}
