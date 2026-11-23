"use client";

// The admin's state in the URL (CLAUDE.md "Jede Kachel → eine Kapsel"): the open capsule (?tab=) and what it highlights or filters (?focus=)
// – a push to the browser's history and one event, so the page follows and the browser's back goes one step back; links can be shared.
// Next's router would re-render the whole route for a search change; a push of our own keeps the page's state (Vision's goVision does the
// same and fires its own event, which this hook follows too).
import { useSyncExternalStore } from "react";
import { VISION_NAV } from "./visionNav";

export const ADMIN_URL = "admin-url";

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(ADMIN_URL, callback);
  window.addEventListener(VISION_NAV, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(ADMIN_URL, callback);
    window.removeEventListener(VISION_NAV, callback);
  };
}

/** The page's search params, following every push (ours, Vision's) and the browser's back and forward. Server and first render: empty. */
export function useAdminSearch(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => "");
  return new URLSearchParams(search);
}

/**
 * Change the URL's params on this page: `null` removes one. A new capsule drops the old focus unless one is given. `replace` changes the
 * current history entry (a filter typed in), otherwise a new entry (back goes to the capsule before).
 */
export function setAdminSearch(next: Record<string, string | null>, { replace = false }: { replace?: boolean } = {}) {
  const params = new URLSearchParams(window.location.search);
  if ("tab" in next && !("focus" in next)) params.delete("focus");
  for (const [key, value] of Object.entries(next)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  }
  const q = params.toString();
  const url = `${window.location.pathname}${q ? `?${q}` : ""}`;
  if (replace) window.history.replaceState(window.history.state, "", url);
  else window.history.pushState(window.history.state, "", url);
  window.dispatchEvent(new Event(ADMIN_URL));
  // Vision's URL hook listens to its own event – tell it too.
  window.dispatchEvent(new Event(VISION_NAV));
}

/**
 * The open capsule from ?tab= (unknown or missing → `fallback`) and its focus (?focus=); `open(tab, focus?)` pushes both. `aliases` maps old
 * values (e.g. "contacts" → "pipeline").
 */
export function useAdminTab<T extends string>(allowed: readonly T[], fallback: T, aliases: Partial<Record<string, T>> = {}) {
  const params = useAdminSearch();
  const raw = params.get("tab") ?? "";
  const mapped = (aliases[raw] ?? raw) as T;
  const tab = allowed.includes(mapped) ? mapped : fallback;
  const focus = params.get("focus");
  const open = (next: T, nextFocus: string | null = null) => setAdminSearch({ tab: next === fallback ? null : next, focus: nextFocus });
  return { tab, focus, open } as const;
}
