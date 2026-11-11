import { cn } from "@/lib/utils";

/**
 * The one selection style for lists and navigation on a light ground (Settings' side list, a sheet's list of choices, Messages' chats): a
 * fully round capsule – chosen: transparent with a 1.5px ink edge (like the header's tab), the words ink semibold where the caller sets them;
 * not chosen: no edge, hover ink 5 %. No rectangles for a choice. Only colours fade (150ms). On a dark ground the chosen one is a filled
 * cream capsule instead (the header's tab on Ember-like surfaces, the chat's own controls).
 */
const BASE = "rounded-full border-[1.5px] transition-[background-color,border-color] duration-150 ease-out";
// Exactly one border colour per state: cn() only joins classes, so two would fight by stylesheet order.
const SELECTED = "border-ink bg-transparent";
const IDLE = "border-transparent hover:bg-ink/5";

export function listItemStyles(selected: boolean, className?: string): string {
  return cn(BASE, selected ? SELECTED : IDLE, className);
}

/** Messages' chat list: the same capsule (kept as its own name for the chat list). */
export const outlineListItemStyles = listItemStyles;
