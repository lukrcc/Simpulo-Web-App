import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

const SIZES = { xs: "size-8", sm: "size-9", md: "size-10", lg: "size-11" } as const;
/** "surface": tertiary, for light surfaces (the page, panels), a circle only on hover. "onImage": dark glass with a white icon, always on photos. */
// "raised": a surface circle with a soft shadow, the icon ink – controls beside photos on the light page (the Spotlight's arrows).
const VARIANTS = { surface: "bg-transparent text-muted transition-colors duration-150 hover:bg-ink/6 hover:text-ink", onImage: "on-image", raised: "bg-surface text-ink shadow-[0_2px_10px_rgba(34,30,27,0.14)] transition-colors duration-150 hover:bg-surface-2" } as const;

/** The classes, for what has to be another element (a link, a menu's trigger). */
export const iconButtonStyles = (size: keyof typeof SIZES = "md", className?: string, variant: keyof typeof VARIANTS = "surface") => cn(VARIANTS[variant], "flex shrink-0 items-center justify-center rounded-full", SIZES[size], className);

/** A round button with only an icon: no frame or shadow; presses in on a click. Always give it an aria-label. */
export function IconButton({ size = "md", variant = "surface", className, children, ref, type = "button", ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { size?: keyof typeof SIZES; variant?: keyof typeof VARIANTS; ref?: Ref<HTMLButtonElement>; children: ReactNode }) {
  return (
    <button ref={ref} type={type} className={iconButtonStyles(size, className, variant)} {...props}>
      {children}
    </button>
  );
}
