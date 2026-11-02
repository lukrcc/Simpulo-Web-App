import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ListRowProps {
  /** 40px column: a 20px muted icon, or a 40px avatar */
  lead?: ReactNode;
  title: ReactNode;
  /** Muted 13px line under the title */
  subtitle?: ReactNode;
  /** Badges before the action */
  aside?: ReactNode;
  /** Right: tertiary (or secondary) button(s), a switch, a chevron */
  action?: ReactNode;
  /** The whole row as one button (no `action` then): hover background bg, bleeding 12px past the text */
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The one list row of the app: 56px, lead in a 40px column, text ink 15px / muted 13px, action right. Lists of rows
 * are separated by 1px line (`divide-y divide-line` on the list). Make the whole row a link by wrapping it.
 */
export function ListRow({ lead, title, subtitle, aside, action, onClick, disabled, className }: ListRowProps) {
  // Spans only, so the row is valid inside a <button> too.
  const content = (
    <>
      {lead !== undefined && <span className="flex w-10 shrink-0 items-center justify-center text-muted [&>svg]:size-5">{lead}</span>}
      <span className="block min-w-0 flex-1">
        <span className="block truncate text-[15px] text-ink">{title}</span>
        {subtitle && <span className="block truncate text-[13px] text-muted">{subtitle}</span>}
      </span>
      {aside}
      {action && <span className="flex shrink-0 items-center gap-4">{action}</span>}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "-mx-3 flex min-h-14 w-[calc(100%+24px)] items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-bg focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-wait",
          className,
        )}
      >
        {content}
      </button>
    );
  }
  return <div className={cn("flex min-h-14 items-center gap-3 py-2", className)}>{content}</div>;
}
