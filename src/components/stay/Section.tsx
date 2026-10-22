import type { ReactNode } from "react";

interface SectionProps {
  title: string;
  /** Right side of the heading row, e.g. a link */
  action?: ReactNode;
  children: ReactNode;
}

/** A titled section of the House page, separated from the one above by a divider line. */
export function Section({ title, action, children }: SectionProps) {
  return (
    <section className="mt-8 border-t border-black/5 pt-6">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
