import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark";
type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  // Orange fill is reserved for the House page's "Join this House" – use "dark" everywhere else.
  primary: "bg-accent text-white hover:bg-accent-dark disabled:bg-neutral-200 disabled:text-neutral-500",
  secondary: "border border-neutral-200 bg-white text-ink hover:border-neutral-400 disabled:text-neutral-400",
  ghost: "text-ink hover:bg-neutral-100 disabled:text-neutral-400",
  dark: "bg-ink text-white hover:bg-black disabled:bg-neutral-200 disabled:text-neutral-500",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

/** Shared button styling for <button> and <Link>. */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    className,
  );
}
