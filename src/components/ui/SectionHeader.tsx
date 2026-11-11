import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/ActionButton";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  id?: string;
  /** A short label over the title – "FITNESS", "DEMAND" – 12px/600 in accent, upper case */
  eyebrow?: string;
  /** Without one, the eyebrow is the heading (the House and profile pages' calm sections) */
  title?: string;
  /** "h1" for the page's one heading (Explore's "Open Houses"); the rows below are h2 */
  as?: "h1" | "h2";
  /** 15px muted line under the title – "Five nights or fewer" */
  subline?: ReactNode;
  /** A count right of the title, on its baseline, without a capsule – "100 houses · 33 countries" */
  meta?: ReactNode;
  /** "See all →" on the right of the title, as a 36px secondary button */
  seeAll?: { href: string; label: string; ariaLabel?: string };
  /** On the right instead of "See all": a text link, a small note or controls (Open Houses: Sort and Filters), on the title's baseline */
  action?: ReactNode;
  /** "explore": Explore's one head for every section – eyebrow, 32px title, a one-line subline, "See all →" as a text link */
  variant?: "default" | "explore";
  className?: string;
}

/**
 * The head of every section (Explore, Host): an optional eyebrow in accent, the title (28px/600) with the count
 * beside it and "See all" on the right, then the subline (15px muted). No line – the sections are set apart by their spacing
 * and the surface bands. The content follows 20px below (its own margin).
 */
export function SectionHeader({ id, eyebrow, title, as: Heading = "h2", subline, meta, seeAll, action, variant = "default", className }: SectionHeaderProps) {
  if (variant === "explore" && title) {
    // Eyebrow (12px caps, ink 55 %) · title 32px · subline muted, one line; right on the title's baseline "See all →" (a text link) or the controls.
    return (
      <div className={className}>
        {eyebrow && <p className="mb-2 text-eyebrow uppercase text-ink/55">{eyebrow}</p>}
        <div className="flex items-baseline justify-between gap-4">
          <Heading id={id} className="min-w-0 text-section text-ink">
            {title}
          </Heading>
          {seeAll && (
            <Link href={seeAll.href} aria-label={seeAll.ariaLabel} className="group inline-flex shrink-0 items-center gap-1.5 text-body font-semibold text-ink transition-colors duration-150 hover:text-ink/70">
              {seeAll.label}
              <ArrowRight aria-hidden className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          )}
          {action && <div className="flex shrink-0 items-baseline gap-2">{action}</div>}
        </div>
        {(subline || meta) && <p className="mt-1 truncate text-body text-muted tabular-nums">{subline ?? meta}</p>}
      </div>
    );
  }
  if (!title) {
    return (
      <div className={cn("flex min-h-6 items-center justify-between gap-4", className)}>
        <Heading id={id} className="text-eyebrow uppercase text-ink/55">
          {eyebrow}
        </Heading>
        {action}
      </div>
    );
  }
  return (
    <div className={className}>
      <div>
        {eyebrow && <p className="mb-2 text-eyebrow uppercase text-ink/55">{eyebrow}</p>}
        {/* With controls beside the title: everything on the title's baseline. */}
        <div className={cn("flex justify-between gap-4", action ? "items-baseline" : "items-center")}>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <Heading id={id} className="min-w-0 text-h2 text-ink">
              {title}
            </Heading>
            {meta && <span className="text-body font-medium tabular-nums text-muted">{meta}</span>}
          </div>
          {seeAll && (
            <Button variant="secondary" size="sm" href={seeAll.href} aria-label={seeAll.ariaLabel}>
              {seeAll.label}
              <ArrowRight aria-hidden />
            </Button>
          )}
          {action && <div className="flex shrink-0 items-baseline gap-2">{action}</div>}
        </div>
        {subline && <p className="mt-1 text-body text-muted">{subline}</p>}
      </div>
    </div>
  );
}
