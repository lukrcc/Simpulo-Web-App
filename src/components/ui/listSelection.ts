import { cn } from "@/lib/utils";

/**
 * The one selection style for lists and navigation (Settings' side list, a sheet's list of choices, Messages' chats): a fully round capsule,
 * coloured by its ground (src/styles/tokens.css, --sel-bg / --sel-border) – on a light ground chosen = transparent with a 1.5px ink edge, on
 * a dark ground (stage, Messages, dark mode) a filled cream 12 % capsule without an edge; the words ink semibold where the caller sets them.
 * Not chosen: no edge, hover 5 % of the words' colour. No rectangles for a choice. Only colours fade (150ms).
 */
const BASE = "rounded-full border-[1.5px] transition-[background-color,border-color] duration-150 ease-out";
// Exactly one border colour per state: cn() only joins classes, so two would fight by stylesheet order.
const SELECTED = "border-(--sel-border) bg-(--sel-bg)";
const IDLE = "border-transparent hover:bg-ink/5";

export function listItemStyles(selected: boolean, className?: string): string {
  return cn(BASE, selected ? SELECTED : IDLE, className);
}

/** Messages' chat list: the same capsule (kept as its own name for the chat list). */
export const outlineListItemStyles = listItemStyles;
