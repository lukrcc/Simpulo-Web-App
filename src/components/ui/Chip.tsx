import { Check } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChipSize = "sm" | "md" | "lg";

/** sm 32px · md 36px · lg 40px, all 14px text. */
const sizes: Record<ChipSize, string> = {
  sm: "h-8 px-3",
  md: "h-9 px-3.5",
  lg: "h-10 px-4",
};

/**
 * The one selection chip, anywhere: --chip-bg without a frame. Chosen: peach, 600, with the accent check on the left (it scales in).
 * Never black: that's for the one main action. Variants only by size.
 */
export function chipStyles(active: boolean, { size = "md" }: { size?: ChipSize } = {}): string {
  return cn(
    "inline-flex min-w-0 shrink-0 items-center gap-1 whitespace-nowrap rounded-full text-nav text-ink transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45",
    sizes[size],
    active ? "bg-(--select-bg) font-semibold" : "bg-(--chip-bg) hover:bg-(--chip-bg-hover)",
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
  /** A leading icon (e.g. the + of "+ Custom"); the check takes its place while active */
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

/** A selection chip as a button (aria-pressed unless a role says otherwise). The label truncates when it must. */
export function Chip({ active, check = true, size, icon, className, children, type = "button", ...props }: ChipProps) {
  return (
    <button type={type} aria-pressed={props.role ? undefined : active} className={cn(chipStyles(active, { size }), "[&>svg]:size-3.5", className)} {...props}>
      {active && check ? <ChipCheck /> : icon}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}
