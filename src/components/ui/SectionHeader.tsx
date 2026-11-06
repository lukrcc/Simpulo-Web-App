import { ArrowRight } from "lucide-react";
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
  className?: string;
}

/**
 * The head of every section (Explore, Host): an optional eyebrow in accent, the title (28px/600) with the count
 * beside it and "See all" on the right, then the subline (15px muted). No line – the sections are set apart by their spacing
 * and the surface bands. The content follows 20px below (its own margin).
 */
export function SectionHeader({ id, eyebrow, title, as: Heading = "h2", subline, meta, seeAll, action, className }: SectionHeaderProps) {
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
