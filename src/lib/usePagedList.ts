"use client";

import { useMemo, useRef, useState } from "react";
import { loadPage } from "./data";

/**
 * A long list shown page by page, loaded only on a click (never on scroll). The first page renders at once (also on the server); every
 * further one comes from the data layer by cursor (loadPage: the mock after a short delay, later Firestore's startAfter + limit). What's
 * loaded is kept as keys, so the items stay live with the store. A new `resetKey` (another filter, sort or tab) starts at the first page.
 */
export function usePagedList<T>({
  list,
  keyOf,
  resetKey,
  firstCount,
  nextCount,
}: {
  list: readonly T[];
  keyOf: (item: T) => string;
  resetKey: string;
  /** How many the first page shows */
  firstCount: number;
  /** How many the next page asks for, given how many are loaded (Explore: up to full rows) */
  nextCount: (loaded: number) => number;
}) {
  const [state, setState] = useState<{ key: string; keys: string[] | null; fresh: ReadonlySet<string>; loading: boolean }>({ key: resetKey, keys: null, fresh: new Set(), loading: false });
  if (state.key !== resetKey) setState({ key: resetKey, keys: null, fresh: new Set(), loading: false });
  // A page arriving for a list that has been reset since is dropped.
  const current = useRef(resetKey);
  current.current = resetKey;

  const byKey = useMemo(() => new Map(list.map((item) => [keyOf(item), item])), [list, keyOf]);
  const items = state.keys === null ? list.slice(0, firstCount) : state.keys.map((key) => byKey.get(key)).filter((item): item is T => item !== undefined);
  const remaining = Math.max(0, list.length - items.length);
  const next = Math.min(nextCount(items.length), remaining);

  async function loadMore() {
    if (state.loading || remaining === 0) return;
    const key = resetKey;
    const loaded = items.map(keyOf);
    setState((s) => ({ ...s, loading: true }));
    const page = await loadPage(list, keyOf, { cursor: loaded.at(-1) ?? null, limit: next });
    if (current.current !== key) return;
    const added = page.items.map(keyOf);
    setState({ key, keys: [...loaded, ...added], fresh: new Set(added), loading: false });
  }

  return {
    items,
    total: list.length,
    hasMore: remaining > 0,
    /** What the button offers: "Show 24 more", "Show 12 more" */
    nextCount: next,
    loading: state.loading,
    loadMore,
    /** The keys of the page that came last: they fade in */
    fresh: state.fresh,
    /** More than one page in all: the end line ("That's all …") belongs to a list that was paged */
    paged: list.length > firstCount,
  };
}
