import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "soft" | "onImage" | "cream" | "creamOutline" | "brand" | "danger" | "graphite";
/** md 44px, the standard · sm 36px · lg 48px (a list's "Show more"). */
export type ButtonSize = "md" | "sm" | "lg";

// Every colour from the ground's tokens (src/styles/tokens.css): on the light floor the primary is ink with cream words, on a stage or a dark
// floor cream with ink words – the same classes.
const primaryLook =
  "bg-(--action-bg) text-(--action-text) shadow-(--edge-highlight) hover:-translate-y-px hover:bg-(--action-hover) hover:shadow-[var(--edge-highlight),var(--shadow-lift)] disabled:translate-y-0 disabled:bg-ink/10 disabled:text-muted disabled:shadow-none";
const variants: Record<ButtonVariant, string> = {
  primary: primaryLook,
  // Light floor: a raised warm white; on a dark ground a 1px cream 25 % outline (--secondary-*).
  secondary: "border border-(--secondary-edge) bg-(--secondary-bg) text-ink shadow-(--secondary-shadow) hover:-translate-y-px hover:bg-(--secondary-hover) disabled:translate-y-0 disabled:border-transparent disabled:bg-ink/10 disabled:text-muted disabled:shadow-none",
  tertiary: "text-ink hover:bg-ink/6 disabled:text-muted disabled:hover:bg-transparent",
  // A filled quiet surface, no black: "Filters" and a list's "Show more" – there for the taking, never the main action.
  soft: "bg-ink/7 text-ink hover:bg-ink/12 disabled:cursor-default disabled:bg-ink/10 disabled:text-muted",
  // On a photo, and only there.
  onImage: "on-image",
  // The stage's main action – the primary itself (on a stage it is cream with ink words by the tokens).
  cream: primaryLook,
  // The stage's other actions: a 1px outline in the words' colour at 25 %.
  creamOutline: "border border-ink/25 text-ink hover:-translate-y-px hover:bg-ink/6 disabled:translate-y-0 disabled:text-ink/50",
  // "Join in": the one orange button of an area (the House page's strip) – the action orange's deep step with white words (4.7 : 1).
  brand: "bg-(--brand-action-fill) text-on-signal shadow-(--edge-highlight) hover:-translate-y-px hover:bg-(--brand-action-fill-hover) hover:shadow-[var(--edge-highlight),var(--shadow-lift)] disabled:translate-y-0 disabled:bg-ink/10 disabled:text-muted disabled:shadow-none",
  // The header panels' main action ("Show N houses", CLAUDE.md "Kopfleisten-Panels einheitlich"): graphite – white words on the light glass,
  // near-black on light grey on the dark (--panel-action-*). No orange.
  graphite: "bg-(--panel-action-bg) text-(--panel-action-text) hover:bg-(--panel-action-bg-hover) disabled:bg-ink/10 disabled:text-muted",
  // Only for what can't be undone (Delete account): a deep red with white words (--danger-fill, 5.4 : 1), the same in light and dark.
  danger: "bg-(--danger-fill) text-on-signal shadow-(--edge-highlight) hover:-translate-y-px hover:bg-(--danger-fill-hover) disabled:translate-y-0 disabled:bg-ink/10 disabled:text-muted disabled:shadow-none",
};

const sizes: Record<ButtonSize, string> = { md: "h-11 px-5", sm: "h-9 px-4", lg: "h-12 px-6" };
/** The page\'s one main action: as wide as its words, never narrower than 200px. */
const primaryMd = "h-11 min-w-[200px] px-7";
/** Tertiary lines up with the text beside it: pull it out by this. */
const tertiarySizes: Record<ButtonSize, string> = { md: "h-11 px-4", sm: "h-9 px-4", lg: "h-12 px-5" };

/** Icon-only buttons: a circle of the size's height. */
const iconSizes: Record<ButtonSize, string> = { md: "size-11", sm: "size-9", lg: "size-12" };

/** The one button system, three ranks: primary (ink, one per area), secondary (raised warm white), tertiary (nothing until hovered). */
export function buttonStyles(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string, icon = false): string {
  return cn(
    "press inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-body font-semibold transition-colors disabled:cursor-not-allowed [&_svg]:size-4",
    variants[variant],
    icon ? iconSizes[size] : variant === "tertiary" ? tertiarySizes[size] : variant === "primary" && size === "md" ? primaryMd : sizes[size],
    className,
  );
}

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon only: a circle (give it an aria-label) */
  icon?: boolean;
  className?: string;
  children: ReactNode;
} & (
  | ({ href: string; external?: boolean } & { "aria-label"?: string })
  | ({ href?: undefined; external?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
);

/** A <button>, or a link with `href` (`external`: a new tab) – styled by buttonStyles. */
export function Button({ variant = "primary", size = "md", icon = false, className, children, ...props }: ButtonProps) {
  const style = buttonStyles(variant, size, className, icon);
  if (props.href !== undefined) {
    const { href, external, ...rest } = props;
    return external ? (
      <a href={href} target="_blank" rel="noopener" className={style} {...rest}>
        {children}
      </a>
    ) : (
      <Link href={href} className={style} {...rest}>
        {children}
      </Link>
    );
  }
  const { href: _href, external: _external, type = "button", ...rest } = props;
  void _href;
  void _external;
  return (
    <button type={type} className={style} {...rest}>
      {children}
    </button>
  );
}

/**
 * "Open a House" in the header (CLAUDE.md "Kopfleiste wie apple.com"): words only – no surface, no edge, no capsule on hover –, 14px medium
 * (500) like the entries' size, in the bar's primary colour; the keyboard's focus a 2px ring. Product and admin.
 */
export const headerActionStyles = cn(
  "inline-flex h-(--header-pill-h) shrink-0 cursor-pointer items-center justify-center gap-1.5 px-2.5 text-nav font-medium text-(--open-house-text) [text-shadow:none] transition-colors duration-150 focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) [&_svg]:size-4 [&_svg]:shrink-0",
);
