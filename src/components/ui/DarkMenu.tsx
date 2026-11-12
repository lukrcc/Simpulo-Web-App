import { Check } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The filters' drop-down menus (the dropdowns of All filters, the sort, Where/When fields in the panel): the bar's dark glass (.bar-menu in
 * tokens.css, like ui/BarSheet), cream words; the chosen entry a cream outline capsule with a check.
 */
export const darkMenuClass = "bar-menu";
/** Every popover at most 320px high, scrolling inside. */
export const darkMenuScroll = "max-h-80 overflow-y-auto overscroll-contain";
// (darkMenuScroll sits on the menu itself, padding included: 320px in all.)

/** `checkbox`: a several-at-once list – a small box on the left (white with an ink check when chosen) instead of the check on the right. */
export function DarkMenuItem({ selected, children, hint, checkbox = false, className, ...props }: { selected: boolean; children: ReactNode; hint?: string; checkbox?: boolean } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex min-h-10 w-full items-center gap-2 rounded-full px-3 text-left text-body transition-colors duration-150",
        selected && !checkbox ? "font-semibold text-ink shadow-[inset_0_0_0_1.5px_var(--text)]" : selected ? "font-semibold text-ink" : "text-ink/85 hover:bg-ink/5 hover:text-ink",
        className,
      )}
    >
      {checkbox && (
        <span aria-hidden className={cn("flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150", selected ? "border-ink bg-ink text-inverse" : "border-ink/40")}>
          {selected && <Check className="size-3" strokeWidth={3} />}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint && <span className="text-small text-ink/55">{hint}</span>}
      {!checkbox && <Check aria-hidden className={cn("size-4 shrink-0", selected ? "opacity-100" : "opacity-0")} strokeWidth={2.5} />}
    </button>
  );
}
