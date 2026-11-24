"use client";

import { useTranslations } from "next-intl";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { applyThemePref, useResolvedTheme, type ResolvedTheme } from "@/lib/theme";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Light and dark – two states, no "System" to pick (CLAUDE.md "Hell/Dunkel in die Tab-Leiste"): the first visit starts from the device
 * (prefers-color-scheme, the cookie's default); a choice applies at once, is kept on this device (cookie) and, signed in, on the account.
 * The one place for the change: `useThemeToggle` (the tab bar's button) and this switch (Settings › Appearance) – both read the mode in
 * effect, so they always agree.
 */
export function useSetTheme() {
  const store = useStore();
  return (next: ResolvedTheme) => {
    applyThemePref(next);
    if (store.currentUserId) store.setAppearance(next);
  };
}

/** Light ↔ dark as one action (the tab bar's button). */
export function useThemeToggle() {
  const mode = useResolvedTheme();
  const set = useSetTheme();
  return { mode, toggle: () => set(mode === "dark" ? "light" : "dark") };
}

/** Settings › Appearance: "Light · Dark" as a segmented control, the mode in effect chosen. */
export function ThemeSwitch({ className }: { className?: string }) {
  const t = useTranslations("settings.ui.appearance");
  const mode = useResolvedTheme();
  const set = useSetTheme();
  return (
    <SegmentedControl
      label={t("label")}
      value={mode}
      onChange={(next) => next !== mode && set(next)}
      options={(["light", "dark"] as const).map((value) => ({ value, label: t(`short.${value}`) }))}
      className={cn("w-44", className)}
    />
  );
}
