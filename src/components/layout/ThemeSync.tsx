"use client";

import { useEffect } from "react";
import { getCurrentUser, useStore } from "@/lib/store";
import { applyThemePref, syncThemeDocument, themeCookiePref } from "@/lib/theme";

/**
 * Keeps light/dark right after the first paint (the head script, lib/themeScript.ts, already set it): the theme-color metas, and the account's
 * choice (UserSettings.appearance) – signed in on a new device, the account wins and the cookie takes it, so the next first paint is right
 * too. Renders nothing. Once in the root layout.
 */
export function ThemeSync() {
  const store = useStore();
  const appearance = getCurrentUser(store)?.settings?.appearance ?? null;
  const signedIn = store.currentUserId !== null;

  useEffect(() => {
    syncThemeDocument();
  }, []);

  // Only a choice the account actually holds wins: right after a reload the signed-in user is there a moment before their saved settings,
  // and "no choice" then must not overwrite this device's (CLAUDE.md "Hell/Dunkel-Auswahl wieder erreichbar": it reset to System).
  useEffect(() => {
    if (!signedIn || appearance === null) return;
    if (appearance !== themeCookiePref()) applyThemePref(appearance);
  }, [signedIn, appearance]);

  return null;
}
