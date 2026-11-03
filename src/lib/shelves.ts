import type { UseEmblaCarouselType } from "embla-carousel-react";

type ShelfApi = NonNullable<UseEmblaCarouselType[1]>;

/*
 * Every mounted <Shelf> by its viewport, for what has to move one from outside: the way back from a House page, and
 * "show me this card" after an interest.
 */
const shelves = new WeakMap<Element, ShelfApi>();

export function registerShelf(api: ShelfApi) {
  const root = api.rootNode();
  shelves.set(root, api);
  return () => void shelves.delete(root);
}

/** Scrolls a shelf so that this slide comes first. */
export function scrollShelfToSlide(api: ShelfApi, slide: number, jump: boolean) {
  const snap = api.internalEngine().slideRegistry.findIndex((slides) => slides.includes(slide));
  if (snap >= 0) api.scrollTo(snap, jump);
}

/** If the card is in a shelf: scrolls that shelf to it. False while that shelf isn't running yet (on a page just loaded). */
export function revealInShelf(card: Element, jump: boolean) {
  const root = card.closest("[data-shelf]");
  if (!root) return true;
  const api = shelves.get(root);
  if (!api) return false;
  const slide = api.slideNodes().findIndex((node) => node.contains(card));
  if (slide >= 0) scrollShelfToSlide(api, slide, jump);
  return true;
}

const shelfRoots = () => [...document.querySelectorAll("[data-shelf]")];

/** Each shelf's exact position, in page order. Dragged freely, a shelf rests between its snaps. */
export const shelfPositions = () => shelfRoots().map((root) => shelves.get(root)?.internalEngine().location.get() ?? 0);

export function placeShelves(positions: number[]) {
  shelfRoots().forEach((root, i) => {
    const api = shelves.get(root);
    if (!api) return;
    const engine = api.internalEngine();
    const position = positions[i] ?? 0;
    for (const vector of [engine.location, engine.previousLocation, engine.offsetLocation, engine.target]) vector.set(position);
    engine.translate.to(position);
    engine.eventHandler.emit("scroll");
  });
}
