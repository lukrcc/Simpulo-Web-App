import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "tertiary";
/** lg 44px · mid 40px · md 36px · sm 32px, 13px text (tertiary is a text link – the size only sets its type) */
export type ButtonSize = "lg" | "mid" | "md" | "sm";

const variants: Record<ButtonVariant, string> = {
  primary: "rounded-full bg-ink text-surface hover:bg-ink/90 disabled:bg-line disabled:text-muted",
  secondary: "rounded-full border border-line bg-surface text-ink hover:bg-bg disabled:text-muted",
  tertiary: "text-ink underline-offset-4 hover:underline disabled:text-muted disabled:no-underline",
};

const sizes: Record<ButtonVariant, Record<ButtonSize, string>> = {
  primary: { lg: "h-11 px-5 text-[15px]", mid: "h-10 px-4 text-sm", md: "h-9 px-4 text-sm", sm: "h-8 px-3.5 text-[13px]" },
  secondary: { lg: "h-11 px-5 text-[15px]", mid: "h-10 px-4 text-sm", md: "h-9 px-4 text-sm", sm: "h-8 px-3.5 text-[13px]" },
  tertiary: { lg: "text-[15px]", mid: "text-sm", md: "text-sm", sm: "text-[13px]" },
};

/** Icon-only buttons: a circle of the size's height (44 / 40 / 36 / 32px). */
const iconSizes: Record<ButtonSize, string> = { lg: "size-11", mid: "size-10", md: "size-9", sm: "size-8" };

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
