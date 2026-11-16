import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";

interface FullBleedSectionProps {
  children: ReactNode;
  /** Vertical padding (Tailwind classes) */
  padding?: string;
  className?: string;
  /** Classes on the inner Container (Explore: its 1440px width) */
  inner?: string;
  /** The page's last section and dark: the footer follows right on it (globals.css --footer-gap) */
  lastTone?: "dark";
}

/**
 * A full-window section (negative margins out of the page container, no transform) with its content back inside a
 * Container – for what runs edge to edge, like the carousels. Transparent (or a dark band with hard edges), and
 * sections are told apart by their spacing and SectionHeader alone.
 */
export function FullBleedSection({ children, padding, className, inner, lastTone }: FullBleedSectionProps) {
  return (
    <div data-glow-section data-last-tone={lastTone} className={cn("relative w-[calc(100vw-var(--scrollbar-w,0px))]", "mx-[calc(50%_-_(100vw_-_var(--scrollbar-w,0px))/2)]", padding, className)}>
      <Container className={inner}>{children}</Container>
    </div>
  );
}
