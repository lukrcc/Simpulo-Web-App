import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark";
type ButtonSize = "xs" | "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  // Orange fill is reserved for the House page's "Join this House" – use "dark" everywhere else.
  primary: "bg-accent text-white hover:bg-accent-dark disabled:bg-neutral-200 disabled:text-neutral-500",
  secondary: "border border-neutral-200 bg-white text-ink hover:border-neutral-400 disabled:text-neutral-400",
  ghost: "text-ink hover:bg-neutral-100 disabled:text-neutral-400",
  dark: "bg-ink text-white hover:bg-black disabled:bg-neutral-200 disabled:text-neutral-500",
};

const sizes: Record<ButtonSize, string> = {
  // 36px everywhere, phones included, 13px type – for two buttons side by side in a tight card (demand cards).
  xs: "h-9 px-2.5 text-[13px]",
  // 44px tall on phones (tap target), compact 36px from md up.
  sm: "h-11 px-3.5 text-sm md:h-9",
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
