"use client";

// The admin's one button (Regel „Admin-Knöpfe“): one height (--adm-capsule-h, the capsules' 32px), full radius, one type size (text-small
// semibold), fixed padding; as wide as its text but at least --adm-button-min, so buttons in a list below each other line up the same
// (right-aligned). Two variants: primary (white filled, dark text – at most one per area) and secondary (outline). Links that act as
// buttons use adminButtonStyles. Every button in /admin goes through here, never the app's Button.
import { useTranslations } from "next-intl";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AdminButtonVariant = "primary" | "secondary";

export function adminButtonStyles(variant: AdminButtonVariant = "secondary", className?: string) {
  return cn(
    "inline-flex h-(--adm-capsule-h) min-w-(--adm-button-min) shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-small font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
    variant === "primary" ? "bg-(--adm-cap-on-bg) text-(--adm-cap-on-text) hover:opacity-90" : "border border-ink/20 text-ink hover:bg-ink/6",
    className,
  );
}

export const AdminButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: AdminButtonVariant }>(function AdminButton({ variant = "secondary", className, type = "button", ...props }, ref) {
  return <button ref={ref} type={type} data-admin-button={variant} className={adminButtonStyles(variant, className)} {...props} />;
});

/** A dialog's footer in the admin: „Abbrechen“ (secondary) left, the one primary action right – both AdminButton. */
export function AdminDialogFooter({ onCancel, cancelLabel, children, className }: { onCancel: () => void; cancelLabel?: string; children: ReactNode; className?: string }) {
  const t = useTranslations("common");
  return (
    <div className={cn("mt-(--adm-inner) flex items-center justify-between gap-3", className)}>
      <AdminButton onClick={onCancel}>{cancelLabel ?? t("cancel")}</AdminButton>
      {children}
    </div>
  );
}
