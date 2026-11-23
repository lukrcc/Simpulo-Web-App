// Only one panel of the header at a time (CLAUDE.md "Kopfleisten-Panels einheitlich"): Where/When, Themes and Filters. Opening one claims
// the place; every other open panel hears it and closes at once. Themes doesn't open on hover while another panel is open.
type Listener = (id: string) => void;
let current: string | null = null;
const listeners = new Set<Listener>();

/** A panel opened: it is the one now; the others close. */
export function claimPanel(id: string) {
  current = id;
  for (const listener of listeners) listener(id);
}

/** A panel closed (only if it is still the current one). */
export function releasePanel(id: string) {
  if (current === id) current = null;
}

/** Another panel than `id` is open right now. */
export function otherPanelOpen(id: string): boolean {
  return current !== null && current !== id;
}

/** Called with the id of every panel that opens. */
export function onPanelClaim(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
