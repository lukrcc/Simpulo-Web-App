import { cn } from "@/lib/utils";

/**
 * The selection style for lists (the chat list in Messages, a sheet's list of choices) – not for chips, tabs or the SegmentedControl,
 * which keep their sliding pill. No white surface: hover is a soft surface (--card-soft's warm white at about 60 %); selected is the same
 * surface plus a 1px ink edge at 18 %. Surface and edge only fade (150ms ease) – nothing slides or scales. The radius stays the caller's.
 */
const BASE = "border transition-[background-color,border-color] duration-150 ease-out hover:bg-[rgba(255,253,250,0.6)]";
const SELECTED = "border-ink/18 bg-[rgba(255,253,250,0.6)]";
// Exactly one border colour per state: cn() only joins classes, so two would fight by stylesheet order.
const IDLE = "border-transparent";

export function listItemStyles(selected: boolean, className?: string): string {
  return cn(BASE, selected ? SELECTED : IDLE, className);
}
