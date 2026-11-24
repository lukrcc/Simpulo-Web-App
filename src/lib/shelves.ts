/*
 * Every <Shelf> is a native horizontal scroller (CLAUDE.md "Flüssiges, ruhiges horizontales Scrollen"): the browser scrolls it – trackpad,
 * Shift + wheel, touch – with its own speed and snap points. What has to move one from outside goes through here: the way back from a House
 * page (each row's position restored) and "show me this card" (focus, find in page).
 */
const shelfRoots = () => [...document.querySelectorAll<HTMLElement>("[data-shelf]")];

/** Where a card starts inside its shelf, as the shelf's scrollLeft that puts it first on the page's edge. */
function startOf(root: HTMLElement, card: Element): number {
  const slide = [...root.querySelectorAll(":scope > .shelf-track > *")].find((node) => node.contains(card)) as HTMLElement | undefined;
  if (!slide) return root.scrollLeft;
  const gutter = parseFloat(getComputedStyle(root).scrollPaddingInlineStart) || 0;
  // offsetLeft counts from the scroller's padding edge, which already holds the gutter (the page's margin).
  return Math.max(0, slide.offsetLeft - gutter);
}

/** If the card is in a shelf: scrolls that shelf so it comes first. Always true (a native scroller is there from the first render). */
export function revealInShelf(card: Element, jump: boolean) {
  const root = card.closest<HTMLElement>("[data-shelf]");
  if (!root) return true;
  root.scrollTo({ left: startOf(root, card), behavior: jump || reducedMotion() ? "auto" : "smooth" });
  return true;
}

/** Each shelf's position (scrollLeft), in page order. */
export const shelfPositions = () => shelfRoots().map((root) => root.scrollLeft);

export function placeShelves(positions: number[]) {
  shelfRoots().forEach((root, i) => {
    root.scrollLeft = positions[i] ?? 0;
  });
}

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
