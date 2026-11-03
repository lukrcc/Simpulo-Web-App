import { Check } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = {
  /** A round radio with a white dot instead of a square box with a check */
  radio?: boolean;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">;

/**
 * The one checkbox (and radio): 20px, surface with a line border; checked an accent fill with a white check (radio:
 * a white dot); accent focus ring. A native input underneath, so labels, keyboard and forms work as usual.
 */
export function Checkbox({ radio = false, className, ...props }: CheckboxProps) {
  return (
    <span className={cn("relative inline-flex size-5 shrink-0", className)}>
      <input
        type={radio ? "radio" : "checkbox"}
        className={cn(
          "peer absolute inset-0 m-0 cursor-pointer appearance-none bg-ink/10 transition-colors checked:bg-(--select-bg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          radio ? "rounded-full" : "rounded-md",
        )}
        {...props}
      />
      {radio ? (
        <span aria-hidden className="pointer-events-none absolute inset-0 m-auto size-2 rounded-full bg-accent opacity-0 peer-checked:opacity-100" />
      ) : (
        <Check aria-hidden strokeWidth={3} className="pointer-events-none absolute inset-0 m-auto size-3.5 text-accent opacity-0 peer-checked:opacity-100" />
      )}
    </span>
  );
}
