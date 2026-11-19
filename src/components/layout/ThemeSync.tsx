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

  useEffect(() => {
    if (!signedIn) return;
    const account = appearance ?? "system";
    if (account !== themeCookiePref()) applyThemePref(account);
  }, [signedIn, appearance]);

  return null;
}
