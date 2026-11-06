import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "onImage";
/** md 44px, the standard · sm 36px. */
export type ButtonSize = "md" | "sm";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink bg-[linear-gradient(to_bottom,#2E2925,#221E1B)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:-translate-y-px hover:bg-[#3A3430] hover:bg-none hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_16px_rgba(0,0,0,0.18)] disabled:translate-y-0 disabled:bg-ink/10 disabled:bg-none disabled:text-muted disabled:shadow-none",
  secondary: "border border-ink/10 bg-(--select-bg) text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:-translate-y-px hover:border-ink/20 hover:bg-white disabled:translate-y-0 disabled:text-muted",
  tertiary: "text-ink hover:bg-ink/6 disabled:text-muted disabled:hover:bg-transparent",
  // On a photo, and only there.
  onImage: "on-image",
};

const sizes: Record<ButtonSize, string> = { md: "h-11 px-5", sm: "h-9 px-4" };
/** The page\'s one main action: as wide as its words, never narrower than 200px. */
const primaryMd = "h-11 min-w-[200px] px-7";
/** Tertiary lines up with the text beside it: pull it out by this. */
const tertiarySizes: Record<ButtonSize, string> = { md: "h-11 px-4", sm: "h-9 px-4" };

/** Icon-only buttons: a circle of the size's height. */
const iconSizes: Record<ButtonSize, string> = { md: "size-11", sm: "size-9" };

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

/** "Open a House" in the header: on every page, so it can't be the page's primary. Light glass, the same hover as secondary. */
export const headerActionStyles = cn(
  "press inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-ink/10 bg-white/60 px-4 text-body font-semibold text-ink backdrop-blur-md transition-colors hover:-translate-y-px hover:border-ink/20 hover:bg-white",
);
