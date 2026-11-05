import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "glass";
/** xl 48px · lg 44px · mid 40px · md 36px · sm 32px, 13px text · bar 36px, 14px text (Explore's filter bar) (tertiary is a text link – the size only sets its type) */
export type ButtonSize = "xl" | "lg" | "mid" | "md" | "sm" | "bar";

const variants: Record<ButtonVariant, string> = {
  primary: "rounded-full bg-ink text-surface hover:bg-ink/90 disabled:bg-ink/10 disabled:text-muted",
  secondary: "rounded-full bg-(--chip-bg) text-ink hover:bg-(--chip-bg-hover) disabled:text-muted",
  tertiary: "text-ink underline-offset-4 hover:underline disabled:text-muted disabled:no-underline",
  // On a photo.
  glass: "on-image rounded-full",
};

const filled: Record<ButtonSize, string> = { xl: "h-12 px-6 text-body", lg: "h-11 px-5 text-body", mid: "h-10 px-4 text-body", md: "h-9 px-4 text-body", sm: "h-8 px-3.5 text-small", bar: "h-9 px-4 text-nav" };
const sizes: Record<ButtonVariant, Record<ButtonSize, string>> = {
  glass: filled,
  primary: { xl: "h-12 px-6 text-body", lg: "h-11 px-5 text-body", mid: "h-10 px-4 text-body", md: "h-9 px-4 text-body", sm: "h-8 px-3.5 text-small", bar: "h-9 px-4 text-nav" },
  secondary: { xl: "h-12 px-6 text-body", lg: "h-11 px-5 text-body", mid: "h-10 px-4 text-body", md: "h-9 px-4 text-body", sm: "h-8 px-3.5 text-small", bar: "h-9 px-4 text-nav" },
  tertiary: { xl: "text-body", lg: "text-body", mid: "text-body", md: "text-body", sm: "text-small", bar: "text-nav" },
};

/** Icon-only buttons: a circle of the size's height (44 / 40 / 36 / 32px). */
const iconSizes: Record<ButtonSize, string> = { xl: "size-12", lg: "size-11", mid: "size-10", md: "size-9", sm: "size-8", bar: "size-9" };

/** The one button system: primary (ink), secondary (surface + line border), tertiary (text link in ink). */
export function buttonStyles(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string, icon = false): string {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 font-semibold transition-colors disabled:cursor-not-allowed [&_svg]:size-4",
    variants[variant],
    icon ? iconSizes[size] : sizes[variant][size],
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
