"use client";

import { useSyncExternalStore } from "react";

/**
 * Between the header's search pill below 1100px (layout/header/CompactSearch.tsx) and the feed on the page (views/ExploreFeed.tsx – Explore,
 * city and collection pages): whether a feed is on the page (then the pill's choices apply to it at once and its filter button opens the
 * feed's filter sheet), and that request itself. Without a feed the pill goes to Explore (/explore?open=filters for the filters).
 */
let feeds = 0;
const listeners = new Set<() => void>();
const openers = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

/** ExploreFeed: "I'm on the page" – the cleanup says it's gone. `openFilters` is called when the pill's filter button is tapped. */
export function registerFeed(openFilters: () => void): () => void {
  feeds += 1;
  openers.add(openFilters);
  emit();
  return () => {
    feeds -= 1;
    openers.delete(openFilters);
    emit();
  };
}

/** The pill's filter button: opens the feed's filter sheet; false without a feed on the page. */
export function requestFeedFilters(): boolean {
  if (openers.size === 0) return false;
  openers.forEach((open) => open());
  return true;
}

/** Whether a feed is on the page. On the server and while hydrating: false. */
export function useFeedOnPage(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => feeds > 0,
    () => false,
  );
}
