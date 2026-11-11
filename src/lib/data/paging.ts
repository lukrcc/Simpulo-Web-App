// Paged lists: one page after a cursor, the way Firestore pages a query – query(…, orderBy(…), startAfter(lastDoc), limit(n)), the total from
// getCountFromServer. The app only ever asks for the next page with the cursor it got; it never needs the whole list.

export interface Page<T> {
  items: T[];
  /** Pass to the next call; null = nothing more */
  nextCursor: string | null;
  /** How many there are in all (the count query) */
  total: number;
}

export interface PageRequest {
  /** The last item's key of the page before; null for the first page */
  cursor: string | null;
  limit: number;
}

/** How long the mock takes for a page – a network round-trip, long enough to see the spinner. */
export const MOCK_PAGE_DELAY_MS = 500;

/** A page of an ordered list after `cursor` (the key of the last item already loaded) – synchronous. */
export function pageOfList<T>(list: readonly T[], keyOf: (item: T) => string, { cursor, limit }: PageRequest): Page<T> {
  const start = cursor === null ? 0 : list.findIndex((item) => keyOf(item) === cursor) + 1;
  // The cursor's item is gone (the list changed meanwhile): nothing after it to give.
  if (cursor !== null && start === 0) return { items: [], nextCursor: null, total: list.length };
  const items = list.slice(start, start + limit);
  const end = start + items.length;
  return { items, nextCursor: end < list.length && items.length > 0 ? keyOf(items.at(-1)!) : null, total: list.length };
}

/** The same, the way a backend answers: after a moment. */
export function delayedPageOfList<T>(list: readonly T[], keyOf: (item: T) => string, request: PageRequest, delayMs = MOCK_PAGE_DELAY_MS): Promise<Page<T>> {
  return new Promise((resolve) => setTimeout(() => resolve(pageOfList(list, keyOf, request)), delayMs));
}
