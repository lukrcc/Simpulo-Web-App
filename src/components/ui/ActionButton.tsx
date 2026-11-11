import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "soft" | "onImage" | "cream" | "creamOutline";
/** md 44px, the standard · sm 36px · lg 48px (a list's "Show more"). */
export type ButtonSize = "md" | "sm" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink bg-[linear-gradient(to_bottom,#2E2925,#221E1B)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:-translate-y-px hover:bg-[#3A3430] hover:bg-none hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_16px_rgba(0,0,0,0.18)] disabled:translate-y-0 disabled:bg-ink/10 disabled:bg-none disabled:text-muted disabled:shadow-none",
  secondary: "border border-ink/10 bg-(--select-bg) text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:-translate-y-px hover:border-ink/20 hover:bg-white disabled:translate-y-0 disabled:text-muted",
  tertiary: "text-ink hover:bg-ink/6 disabled:text-muted disabled:hover:bg-transparent",
  // A filled quiet surface, no black: "Filters" and a list's "Show more" – there for the taking, never the main action.
  soft: "bg-ink/7 text-ink hover:bg-ink/12 disabled:cursor-default",
  // On a photo, and only there.
  onImage: "on-image",
  // On an Ember surface (the House page's head and its floating bar), and only there: the main action is cream with ink words …
  cream: "bg-[#F4EEE7] text-[#221E1B] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] hover:-translate-y-px hover:bg-white hover:shadow-[0_6px_16px_rgba(0,0,0,0.28)] disabled:translate-y-0 disabled:bg-[#F4EEE7]/15 disabled:text-[#F4EEE7]/60 disabled:shadow-none",
  // … the others a cream outline.
  creamOutline: "border border-[#F4EEE7]/40 text-[#F4EEE7] hover:-translate-y-px hover:border-[#F4EEE7]/70 hover:bg-[#F4EEE7]/8 disabled:translate-y-0 disabled:text-[#F4EEE7]/50",
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

/** "Open a House" in the header: the header's one dark button (ink, white text, a plus before it), 36px; everything else in the header stays light. */
export const headerActionStyles = cn(
  // "Open a House": the outline button – no fill, no gradient, a 1.5px ink edge, ink text and plus; hover ink 5 %. Exactly the tab capsule's
  // active pill: 36px, padding 0 16px, 15px semibold, fully round; the plus a 16px block on the text's centre line.
  "press inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border-[1.5px] border-ink bg-transparent px-4 text-nav-main font-semibold text-ink transition-colors duration-150 hover:bg-ink/5 [&_svg]:block [&_svg]:size-4",
);
