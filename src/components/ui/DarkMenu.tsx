import { Check } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The filters' drop-down menus (their dropdowns, sort, More): dark – ink, white text (.menu-dark), radius 20px. The chosen entry sits on
 * 12 % white with a check. One look for all of them.
 */
export const darkMenuClass = "menu-dark animate-fade-in rounded-[20px] p-1.5";
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
        "flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-body transition-colors duration-150",
        selected ? "bg-ink/12 font-semibold text-ink" : "text-ink/85 hover:bg-ink/8 hover:text-ink",
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
