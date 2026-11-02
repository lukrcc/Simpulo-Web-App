import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";

interface SurfaceBandProps {
  children: ReactNode;
  /** The background: surface (the default) or the page colour – Explore's sections take turns */
  tone?: "surface" | "bg";
  /** Vertical padding (Tailwind classes); 64px / 64px by default (the Host page) */
  padding?: string;
  className?: string;
}

/**
 * A full-window band (negative margins out of the page container, no transform) with its content back inside a
 * Container – the sections of Explore and the Host page. No border, no shadow; cards on a surface band cast a
 * lighter hover shadow (.surface-band in globals.css).
 */
export function SurfaceBand({ children, tone = "surface", padding = "py-16", className }: SurfaceBandProps) {
  return (
    <div
      className={cn(
        "relative w-[calc(100vw-var(--scrollbar-w,0px))]",
        "mx-[calc(50%_-_(100vw_-_var(--scrollbar-w,0px))/2)]",
        tone === "surface" ? "surface-band bg-surface" : "bg-bg",
        padding,
        className,
      )}
    >
      <Container>{children}</Container>
    </div>
  );
}
