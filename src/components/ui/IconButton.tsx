import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

const SIZES = { xs: "size-8", sm: "size-9", md: "size-10", lg: "size-11" } as const;

/** The classes, for what has to be another element (a link, a menu's trigger). */
export const iconButtonStyles = (size: keyof typeof SIZES = "md", className?: string) => cn("icon-button flex shrink-0 items-center justify-center rounded-full", SIZES[size], className);

/** A round button with only an icon: frosted grey, no frame or shadow; darker on hover, presses in on a click. Always give it an aria-label. */
export function IconButton({ size = "md", className, children, ref, type = "button", ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { size?: keyof typeof SIZES; ref?: Ref<HTMLButtonElement>; children: ReactNode }) {
  return (
    <button ref={ref} type={type} className={iconButtonStyles(size, className)} {...props}>
      {children}
    </button>
  );
}
