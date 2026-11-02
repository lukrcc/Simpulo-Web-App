import { cn } from "@/lib/utils";

/** 44px tap target around a 44×24 switch – accent when on. */
export function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="flex size-11 shrink-0 items-center justify-center">
      <span className={cn("relative h-6 w-11 rounded-full transition-colors", on ? "bg-accent" : "bg-line")}>
        <span
          className={cn("absolute left-0 top-0.5 size-5 rounded-full bg-surface shadow transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")}
        />
      </span>
    </button>
  );
}
