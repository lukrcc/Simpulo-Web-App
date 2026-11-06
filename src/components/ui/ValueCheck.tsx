import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The small accent check right after a field's picked value (selects, comboboxes): the value's text again, invisible,
 * at the field's text position, followed by the visible check – so the check sits right next to the text, whatever
 * its width. `inset`: the field's left padding (default 16px; 40px with a leading icon).
 */
export function ValueCheck({ text, inset = "left-4", maxRight = "right-10" }: { text: string; inset?: string; /** Where the text area ends (before the chevron) */ maxRight?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-y-0 flex min-w-0 items-center overflow-hidden text-body", inset, maxRight)}>
      <span className="invisible truncate whitespace-pre">{text}</span>
      <Check className="ml-1.5 size-3.5 shrink-0 text-ink" strokeWidth={3} />
    </span>
  );
}
