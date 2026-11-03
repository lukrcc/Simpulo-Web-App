import { Check } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

export type ChipSize = "sm" | "md" | "lg";

/** sm 32px · md 36px · lg 40px, all 14px text. */
const sizes: Record<ChipSize, string> = {
  sm: "h-8 px-3",
  md: "h-9 px-3.5",
  lg: "h-10 px-4",
};

export type ChipVariant = "capsule" | "text";

/**
 * The one selection chip, anywhere. "capsule" (panels and popovers): --chip-bg without a frame; chosen: peach, 600, with the accent check
 * on the left (it scales in). "text" (a row of categories): no surface, 15px/500 muted, 36px high; chosen: ink, 600, on the row's one
 * sliding capsule (ChipIndicator). Never black: that's for the one main action.
 */
export function chipStyles(active: boolean, { size = "md", variant = "capsule" }: { size?: ChipSize; variant?: ChipVariant } = {}): string {
  if (variant === "text") {
    return cn(
      "relative z-1 inline-flex h-9 min-w-0 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3.5 text-body font-medium transition-colors duration-150 [&_svg]:size-4",
      active ? "font-semibold text-ink" : "text-muted hover:bg-(--chip-text-hover) hover:text-ink",
    );
  }
  return cn(
    "inline-flex min-w-0 shrink-0 items-center gap-1 whitespace-nowrap rounded-full text-nav text-ink transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45",
    sizes[size],
    active ? "bg-(--select-bg) font-semibold" : "bg-(--chip-bg) hover:bg-(--chip-bg-hover)",
  );
}

/** A text chip's label, as wide as it is in 600: choosing it moves nothing in the row. */
export function TextChipLabel({ children }: { children: ReactNode }) {
  return (
    <span className="grid min-w-0">
      <span className="col-start-1 row-start-1 truncate">{children}</span>
      <span aria-hidden className="invisible col-start-1 row-start-1 h-0 overflow-hidden font-semibold">
        {children}
      </span>
    </span>
  );
}

/** The accent check of an active chip – it scales in (0.6 → 1, 140ms) when the chip is picked. */
export function ChipCheck() {
  return <Check className="size-3.5 shrink-0 text-accent motion-safe:animate-check-in" strokeWidth={3} aria-hidden />;
}

type ChipProps = {
  active: boolean;
  /** The accent check while active – off for "All" and chips that clear a filter */
  check?: boolean;
  size?: ChipSize;
  variant?: ChipVariant;
  /** A leading icon (e.g. the + of "+ Custom"); the check takes its place while active */
  icon?: ReactNode;
  /** A text chip's chevron */
  trailing?: ReactNode;
  /** A text chip that isn't in its row's capsule (a menu's trigger): chosen only shows in the text */
  indicate?: boolean;
  ref?: Ref<HTMLButtonElement>;
  className?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

/** A selection chip as a button (aria-pressed unless a role says otherwise). The label truncates when it must. */
export function Chip({ active, check = true, size, variant = "capsule", icon, trailing, indicate = true, className, children, type = "button", ...props }: ChipProps) {
  if (variant === "text") {
    return (
      <button type={type} data-chip-active={active && indicate ? "" : undefined} aria-pressed={props.role || "aria-expanded" in props ? undefined : active} className={cn(chipStyles(active, { variant }), className)} {...props}>
        <TextChipLabel>{children}</TextChipLabel>
        {trailing}
      </button>
    );
  }
  return (
    <button type={type} aria-pressed={props.role ? undefined : active} className={cn(chipStyles(active, { size }), "[&>svg]:size-3.5", className)} {...props}>
      {active && check ? <ChipCheck /> : icon}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}
