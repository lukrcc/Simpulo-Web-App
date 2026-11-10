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

export type ChipVariant = "capsule" | "text" | "plain";

/**
 * The one selection chip, anywhere (categories, filter chips, "Short trips", choices in panels and popovers). Black means "chosen by you":
 * - not chosen: transparent, a 1px edge ink 12 %, text ink 80 %; hover a breath of ink (5 %)
 * - chosen: ink, white text, no edge (150ms)
 * "capsule" and "text" look the same (text: the 32px row size by default); "plain" is the quiet default of a row ("All"): no pill at all,
 * bold ink while it's the state, otherwise plain text.
 */
/** Chosen, anywhere: ink with white text. Never a white pill, never orange. */
export const selectedSurface = "bg-ink text-white";

export function chipStyles(active: boolean, { size = "md", variant = "capsule" }: { size?: ChipSize; variant?: ChipVariant; /** Kept for callers; there's no surface-less chip any more */ hoverSurface?: boolean } = {}): string {
  if (variant === "plain") {
    return cn(
      "press relative inline-flex min-w-0 shrink-0 items-center whitespace-nowrap rounded-full text-nav transition-colors duration-150",
      size === "sm" ? "h-8 px-2" : "h-9 px-2.5",
      active ? "font-semibold text-ink" : "text-ink/80 hover:text-ink",
    );
  }
  return cn(
    "press inline-flex min-w-0 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border text-nav transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-3.5",
    sizes[size],
    active ? "border-transparent bg-ink font-medium text-white" : "border-ink/12 text-ink/80 hover:bg-ink/5 hover:text-ink",
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
  return <Check className="size-3.5 shrink-0 text-current motion-safe:animate-check-in" strokeWidth={3} aria-hidden />;
}

type ChipProps = {
  active: boolean;
  size?: ChipSize;
  variant?: ChipVariant;
  /** A leading icon (e.g. the + of "+ Custom"); the check takes its place while active */
  icon?: ReactNode;
  /** A text chip's chevron */
  trailing?: ReactNode;
  /** Text chips: false for tabs, where only the chosen one has a surface */
  hoverSurface?: boolean;
  /** A text chip that isn't in its row's capsule (a menu's trigger): chosen only shows in the text */
  indicate?: boolean;
  ref?: Ref<HTMLButtonElement>;
  className?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

/** A selection chip as a button (aria-pressed unless a role says otherwise). The label truncates when it must. */
export function Chip({ active, size, variant = "capsule", icon, trailing, indicate = true, hoverSurface = true, className, children, type = "button", ...props }: ChipProps) {
  if (variant === "text" || variant === "plain") {
    // The label as wide as in its chosen weight: picking it moves nothing in the row.
    return (
      <button type={type} data-chip-active={active && indicate ? "" : undefined} aria-pressed={props.role || "aria-expanded" in props ? undefined : active} className={cn(chipStyles(active, { variant, size, hoverSurface }), className)} {...props}>
        <TextChipLabel>{children}</TextChipLabel>
        {trailing}
      </button>
    );
  }
  return (
    <button type={type} aria-pressed={props.role ? undefined : active} className={cn(chipStyles(active, { size }), "[&>svg]:size-3.5", className)} {...props}>
      {icon}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}
