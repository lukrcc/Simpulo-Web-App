import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { formInput } from "@/components/form/FormLayout";
import { cn } from "@/lib/utils";

type SelectProps = {
  /** Field width: the full width (default) or as wide as its content */
  fit?: boolean;
  className?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">;

/**
 * The one native select: the 48px field (ui/Input.tsx) and our chevron. Never a check in the closed field – the value is the answer; the
 * padding leaves its text room so nothing is cut off. Nothing picked ("") shows muted. The list itself is the browser's.
 */
export function Select({ fit = false, className, value, children, ...props }: SelectProps) {
  const picked = value !== undefined && value !== "";
  return (
    <span className={cn("relative", fit ? "inline-block" : "block", className)}>
      <select value={value} className={cn(formInput, "appearance-none truncate pl-4 pr-9 [&>option]:text-ink", !picked && "text-muted", fit && "w-auto")} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </span>
  );
}
