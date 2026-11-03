import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The soft shadow of every container card (forms, panels) – no border. House cards with a photo have their own look. */
export const cardShadow = "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]";

/** The one container card: surface, no border, the soft shadow, 24px radius, 40px padding. Never nested – split with CardSection. */
export const cardClass = `rounded-3xl bg-surface p-10 ${cardShadow}`;

export function Card({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn(cardClass, className)}>
      {children}
    </section>
  );
}

/** A card made of sections: 1px line between them, 20px above and below each line. */
export function SectionedCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("divide-y divide-line rounded-3xl bg-surface px-10 py-1", cardShadow, className)}>{children}</div>;
}

/** One section of a card: 16px/500 heading left; right at most one secondary button or a Badge; the content below. */
export function CardSection({
  title,
  description,
  action,
  children,
  className,
  id,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  id?: string;
}) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={title ? headingId : undefined} className={cn("py-5", className)}>
      {(title || action) && (
        <div className="flex min-h-9 items-center justify-between gap-3">
          {title && (
            <h3 id={headingId} className="text-body font-medium text-ink">
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      {description && <p className="text-small text-muted">{description}</p>}
      {children && <div className={title || action || description ? "mt-2" : undefined}>{children}</div>}
    </section>
  );
}
