import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelProps<T extends ElementType> = { as?: T; className?: string; children?: ReactNode; /** No inner padding: content that runs to the edges (a photo on top) */ flush?: boolean } & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children" | "flush">;

/**
 * The one content box (everything but House cards): the soft card material (`.card-soft`), radius 24px, padding 24px. Layout
 * (flex, gaps) comes from `className`; radius, shadow and padding stay the same everywhere.
 */
export function Panel<T extends ElementType = "section">({ as, className, children, flush = false, ...rest }: PanelProps<T>) {
  const Tag: ElementType = as ?? "section";
  // cn() only joins classes – a "p-0" in className couldn't beat "p-6", so no-padding is a prop.
  return (
    <Tag className={cn("card-soft rounded-3xl", !flush && "p-6", className)} {...rest}>
      {children}
    </Tag>
  );
}
