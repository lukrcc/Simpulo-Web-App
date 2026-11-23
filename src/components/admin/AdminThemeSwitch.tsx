"use client";

// The appearance switch (CLAUDE.md "Admin nutzt die Produkt-Farben"): a small capsule with three symbols – Monitor = System (the default,
// follows the device), Sonne = Hell, Mond = Dunkel. It changes the product's ONE setting (Settings › Appearance: cookie + account, lib/theme.ts)
// – product and admin always look alike. In the admin's side list next to "System" and in the avatar menu while you're in the admin.
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useStore } from "@/lib/store";
import { applyThemePref, THEME_PREFS, useThemePref, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ICONS: Record<ThemePref, LucideIcon> = { system: Monitor, light: Sun, dark: Moon };

export function AdminThemeSwitch({ labels, className, strip = false }: { /** Words from outside the admin's provider (the avatar menu, English) */ labels?: Record<ThemePref, string> & { label: string }; className?: string; /** The side list's bottom strip: full width, as high as a group heading, three equal fields */ strip?: boolean }) {
  const pref = useThemePref();
  const store = useStore();
  const choose = (next: ThemePref) => {
    if (next === pref) return;
    applyThemePref(next);
    store.setAppearance(next);
  };
  return (
    <div
      role="radiogroup"
      aria-label={labels?.label ?? DE.label}
      data-admin-theme-switch={strip ? "strip" : ""}
      className={cn(
        strip ? "grid h-(--sidebar-heading-h) w-full grid-cols-3 gap-0.5 rounded-lg bg-(--adm-theme-strip-bg) p-0.5" : "inline-flex shrink-0 items-center gap-0.5 rounded-full border border-ink/12 p-0.5",
        className,
      )}
    >
      {THEME_PREFS.map((value) => {
        const Icon = ICONS[value];
        const on = value === pref;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={labels?.[value] ?? DE[value]}
            data-tooltip={strip ? (labels?.[value] ?? DE[value]) : undefined}
            onClick={() => choose(value)}
            className={cn(
              strip
                ? cn("adm-press flex h-full items-center justify-center rounded-md transition-colors duration-150", on ? "bg-(--adm-theme-strip-on) text-ink" : "text-ink/50 hover:bg-ink/6 hover:text-ink")
                : cn("flex size-7 items-center justify-center rounded-full transition-colors duration-150", on ? "bg-(--adm-cur-tint,var(--chip-bg)) text-ink" : "text-ink/50 hover:bg-ink/6 hover:text-ink"),
            )}
          >
            <Icon aria-hidden className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}

/** Inside the admin the words come from admin.de.ts; kept here as a fallback for the switch's own labels. */
const DE: Record<ThemePref | "label", string> = { label: "Darstellung", system: "System", light: "Hell", dark: "Dunkel" };

/** The admin's words for the switch (admin.de.ts), for callers inside the admin's provider. */
export function useAdminThemeLabels() {
  const t = useTranslations("admin.theme");
  return { label: t("label"), system: t("system"), light: t("light"), dark: t("dark") };
}
