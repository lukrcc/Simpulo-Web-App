import { Check } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * md 36px · sm 32px · fit 36px with tight padding (grid cells) · row: the header's category row (padding grows with
 * the width) · explore: Explore's header row – 40px, 15px text, 18px sides (the compact header shows it at 0.9: 36px)
 */
export type ChipSize = "md" | "sm" | "fit" | "row" | "explore";

const sizes: Record<ChipSize, string> = {
  md: "h-9 px-4 text-sm",
  sm: "h-8 px-3 text-[13px]",
  fit: "h-9 justify-center px-2 text-sm",
  row: "h-9 px-2.5 text-sm lg:px-3 xl:px-[14px]",
  explore: "h-10 px-[18px] text-[15px]",
};

/**
 * The one selection chip: inactive surface with a line border (`quiet`: transparent and muted, for a secondary row),
 * active ink with surface text. `check`: the active chip leads with a 14px check in accent (off for "All").
 */
export function chipStyles(active: boolean, { size = "md", quiet = false }: { size?: ChipSize; quiet?: boolean } = {}): string {
  return cn(
    "inline-flex min-w-0 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
    sizes[size],
    active ? "border-ink bg-ink text-surface" : quiet ? "border-line bg-transparent text-muted hover:bg-surface" : "border-line bg-surface text-ink hover:bg-bg",
  );
}

/** The accent check of an active chip. */
export function ChipCheck() {
  return <Check className="size-3.5 shrink-0 text-accent" strokeWidth={3} aria-hidden />;
}

type ChipProps = {
  active: boolean;
  /** The accent check while active – off for "All" and chips that clear a filter */
  check?: boolean;
  size?: ChipSize;
  quiet?: boolean;
  /** A leading icon (e.g. the + of "+ Custom"); the check takes its place while active */
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

/** A selection chip as a button (aria-pressed unless a role says otherwise). The label truncates when it must. */
export function Chip({ active, check = true, size, quiet, icon, className, children, type = "button", ...props }: ChipProps) {
  return (
    <button type={type} aria-pressed={props.role ? undefined : active} className={cn(chipStyles(active, { size, quiet }), "[&>svg]:size-3.5", className)} {...props}>
      {active && check ? <ChipCheck /> : icon}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}
