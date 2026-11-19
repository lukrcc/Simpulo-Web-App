/**
 * Light and dark mode (CLAUDE.md "Dark Mode"). One choice: System (default) · Light · Dark – Settings › Appearance. It lives in two places:
 * on the account (UserSettings.appearance, the same on every device) and in a cookie on this device (THEME_COOKIE), so the very first paint
 * is already right: THEME_SCRIPT in <head> reads the cookie (and prefers-color-scheme for "system") and sets data-theme on <html> before
 * anything is drawn. Colours never read the mode – only the tokens do (styles/tokens.css :root[data-theme="dark"]). No "use client" here: the
 * root layout (a server component) reads the script and the colours.
 */
export type ThemePref = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
export const THEME_PREFS: readonly ThemePref[] = ["system", "light", "dark"];
export const THEME_COOKIE = "simpulo_theme";
/**
 * <meta name="theme-color"> per mode (the browser's bar and the iPhone's status bar continue the header): a meta tag can't read a CSS variable,
 * so the values are written out here (like the OG images). Light: the header's graphite (--graphite). Dark: the header's glass over the dark
 * floor (--header-bg over --bg), a step deeper.
 */
export const THEME_COLOR: Record<ResolvedTheme, string> = { light: "#48423E", dark: "#3E3935" };

export const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Before the first paint (app/layout.tsx, beforeInteractive): data-theme on <html> from the cookie, else the system; the theme-color metas follow. */
export const THEME_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark|system)/),p=m?m[1]:"system",d=p==="dark"||(p==="system"&&matchMedia(${JSON.stringify(DARK_QUERY)}).matches),h=document.documentElement;h.setAttribute("data-theme",d?"dark":"light");h.setAttribute("data-theme-pref",p);if(p!=="system"){var c=d?${JSON.stringify(THEME_COLOR.dark)}:${JSON.stringify(THEME_COLOR.light)};document.querySelectorAll('meta[name="theme-color"]').forEach(function(e){e.setAttribute("content",c)})}}catch(e){}`;
