import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
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
  /** A count as a badge right of the title – "100 houses · 33 countries" */
  meta?: ReactNode;
  /** "See all →" on the right of the title, as a 36px secondary button */
  seeAll?: { href: string; label: string; ariaLabel?: string };
  /** On the right instead of "See all": a text link or a small note */
  action?: ReactNode;
  className?: string;
}

/**
 * The head of every section (Explore, Host): an optional eyebrow in accent, the title (28px/600) with the count badge
 * beside it and "See all" on the right, then the subline (15px muted). No line – the sections are set apart by their spacing
 * and the surface bands. The content follows 20px below (its own margin).
 */
export function SectionHeader({ id, eyebrow, title, as: Heading = "h2", subline, meta, seeAll, action, className }: SectionHeaderProps) {
  if (!title) {
    return (
      <div className={cn("flex min-h-6 items-center justify-between gap-4", className)}>
        <Heading id={id} className="text-eyebrow uppercase text-accent">
          {eyebrow}
        </Heading>
        {action}
      </div>
    );
  }
  return (
    <div className={className}>
      <div>
        {eyebrow && <p className="mb-2 text-eyebrow uppercase text-accent">{eyebrow}</p>}
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <Heading id={id} className="min-w-0 text-h2 text-ink">
              {title}
            </Heading>
            {meta && (
              <Badge onPage className="tabular-nums">
                {meta}
              </Badge>
            )}
          </div>
          {seeAll && (
            <Button variant="secondary" href={seeAll.href} aria-label={seeAll.ariaLabel}>
              {seeAll.label}
              <ArrowRight aria-hidden />
            </Button>
          )}
        </div>
        {subline && <p className="mt-1 text-body text-muted">{subline}</p>}
      </div>
    </div>
  );
}
