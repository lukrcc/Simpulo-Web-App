import { cn } from "@/lib/utils";

/**
 * THE switch (CLAUDE.md "Schalter an = Salbei, aus = neutrales Grau, nie Orange") – Settings, the account menu, the admin, the Dev menu.
 * iOS proportions: a 51 × 31 track, a 27px white knob with a fine shadow. Off: the track neutral grey (--switch-off: a mid grey on light
 * grounds, white 18 % on dark ones), the knob left. On: the track sage (--switch-on), the knob right – the state reads from the knob's place
 * too, not only from colour. 44px high to tap; aria-checked; the focus ring shows on keyboard focus. The knob slides in 200ms (none with
 * reduced motion). Never orange (orange means "join in").
 */
export function Switch({ on, label, onChange, disabled = false, className }: { on: boolean; label: string; onChange: (on: boolean) => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      data-switch
      className={cn("group inline-flex h-11 w-[51px] shrink-0 items-center rounded-full disabled:cursor-not-allowed disabled:opacity-50", className)}
    >
      <span aria-hidden className={cn("relative h-[31px] w-[51px] rounded-full transition-colors duration-200 motion-reduce:transition-none", on ? "bg-(--switch-on)" : "bg-(--switch-off)")}>
        <span
          className={cn(
            "absolute left-0.5 top-0.5 size-[27px] rounded-full bg-(--switch-knob) shadow-(--switch-knob-shadow) transition-transform duration-200 ease-out motion-reduce:transition-none",
            on ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
