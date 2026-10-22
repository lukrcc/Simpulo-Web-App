import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  /** Optional – omit for a text-only empty state */
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-neutral-200 px-6 py-12 text-center">
      {Icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon className="size-6" />
        </div>
      )}
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
