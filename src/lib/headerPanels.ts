// Only one panel of the header at a time (CLAUDE.md "Kopfleisten-Panels einheitlich"): Where/When, Themes and Filters. Opening one claims
// the place; every other open panel hears it and closes at once. Themes doesn't open on hover while another panel is open.
type Listener = (id: string) => void;
let current: string | null = null;
/** The open panel was pinned (a click on its entry or something done inside it): hovering other entries doesn't switch it then. */
let pinned: string | null = null;
const listeners = new Set<Listener>();

/** A panel opened: it is the one now; the others close. */
export function claimPanel(id: string) {
  current = id;
  // The bottom bar (BottomTabBar) never lies over an open panel: html[data-panel-open] hides it.
  if (typeof document !== "undefined") document.documentElement.dataset.panelOpen = id;
  for (const listener of listeners) listener(id);
}

/** A panel closed (only if it is still the current one). */
export function releasePanel(id: string) {
  if (pinned === id) pinned = null;
  if (typing === id) typing = null;
  if (current !== id) return;
  current = null;
  if (typeof document !== "undefined") delete document.documentElement.dataset.panelOpen;
}

/** Pin the panel `id` (CLAUDE.md "Panels – Klick schließt nicht mehr direkt nach Hover-Öffnen"). */
export function pinPanel(id: string) {
  pinned = id;
}

/** Someone typed into a field of the panel `id` and the field still has the focus: hover doesn't switch panels then (only a click). */
let typing: string | null = null;
export function setPanelTyping(id: string, on: boolean) {
  if (on) typing = id;
  else if (typing === id) typing = null;
}

/** The open panel is being typed into: hovering another entry must not take it over. */
export function otherPanelTyping(id: string): boolean {
  return typing !== null && typing !== id && current === typing;
}

/** Another panel than `id` is open and pinned: hovering `id`'s entry must not take it over. */
export function otherPanelPinned(id: string): boolean {
  return pinned !== null && pinned !== id && current === pinned;
}

/** Another panel than `id` is open right now. */
export function otherPanelOpen(id: string): boolean {
  return current !== null && current !== id;
}

/** Close whatever is open (the shared layer behind the panels was clicked, CLAUDE.md "Kopfleiste wie apple.com"). */
export function closePanels() {
  for (const listener of listeners) listener(CLOSE_ALL);
}
const CLOSE_ALL = "__close__";

/** Called with the id of every panel that opens. */
export function onPanelClaim(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
