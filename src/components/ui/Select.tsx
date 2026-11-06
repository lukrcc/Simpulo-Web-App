import { Check, ChevronDown } from "lucide-react";
import { Children, isValidElement, type ReactNode, type SelectHTMLAttributes } from "react";
import { formInput } from "@/components/form/FormLayout";
import { cn } from "@/lib/utils";
import { ValueCheck } from "./ValueCheck";

type SelectProps = {
  /** Field width: the full width (default) or as wide as its content */
  fit?: boolean;
  className?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">;

/** The label of the <option> holding `value` (direct children only; options inside optgroups aren't searched). */
function labelOf(children: ReactNode, value: unknown): string | null {
  for (const child of Children.toArray(children)) {
    if (isValidElement<{ value?: unknown; children?: ReactNode }>(child) && child.type === "option" && String(child.props.value) === String(value)) {
      return typeof child.props.children === "string" || typeof child.props.children === "number" ? String(child.props.children) : null;
    }
  }
  return null;
}

/**
 * The one native select: the 44px field, our chevron, and – once a value is picked ("" counts as none) – a small check
 * in accent right after the chosen text. The list itself is the browser's.
 */
export function Select({ fit = false, className, value, children, ...props }: SelectProps) {
  const picked = value !== undefined && value !== "";
  const label = picked ? labelOf(children, value) : null;
  return (
    <span className={cn("relative", fit ? "inline-block" : "block", className)}>
      <select
        value={value}
        className={cn(formInput, "appearance-none [&>option]:text-ink", picked ? "pr-15" : "pr-9", !picked && "text-muted", fit && "w-auto")}
        {...props}
      >
        {children}
      </select>
      {picked &&
        (label !== null ? (
          <ValueCheck text={label} />
        ) : (
          <Check className="pointer-events-none absolute right-9 top-1/2 size-3.5 -translate-y-1/2 text-ink" strokeWidth={3} aria-hidden />
        ))}
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </span>
  );
}
