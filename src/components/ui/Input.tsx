import type { InputHTMLAttributes, Ref, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * The one field of the app (inputs, native selects, textareas, field-like triggers such as the Combobox): 48px, radius 12px, transparent
 * (on a card it is the card) with a 1px ink 10 % edge – never a grey fill. Focus: the edge ink 40 % and a 3px soft orange ring
 * rgba(240,99,58,0.15). Invalid (aria-invalid): a red edge. Numbers are typed (inputMode="numeric"), never steppers.
 */
export const inputStyles =
  "h-12 w-full rounded-xl border border-ink/10 bg-transparent px-4 text-body text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted focus:border-ink/40 focus:ring-3 focus:ring-[rgba(240,99,58,0.15)] disabled:cursor-not-allowed disabled:text-muted aria-invalid:border-red-400";

/** The textarea: the same field, growing from `rows`. */
export const textareaStyles = cn(inputStyles, "h-auto resize-none py-3 leading-relaxed");

export function Input({ className, ref, ...props }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cn(inputStyles, className)} {...props} />;
}

export function Textarea({ className, ref, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} className={cn(textareaStyles, className)} {...props} />;
}
