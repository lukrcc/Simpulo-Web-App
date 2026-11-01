import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark";
type ButtonSize = "xs" | "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  // No orange buttons: primary and dark are both ink with surface text.
  primary: "bg-ink text-surface hover:bg-ink/90 disabled:bg-line disabled:text-muted",
  secondary: "border border-line bg-surface text-ink hover:bg-bg disabled:text-muted",
  ghost: "text-ink hover:bg-bg disabled:text-muted",
  dark: "bg-ink text-surface hover:bg-ink/90 disabled:bg-line disabled:text-muted",
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
