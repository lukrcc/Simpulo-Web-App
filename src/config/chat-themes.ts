// Chat backgrounds – a choice per person (Messages › "…" › Chat background for one chat, Settings › Chats for all). No free colours: these six,
// each with everything a chat paints – the ground, the others' bubble (and its fine line), your bubble, the words in each, the times. Every
// pair holds 4.5 : 1 (measured: text on the ground ≥ 11.8, in the others' bubble ≥ 12.0, in yours ≥ 8.9, the times ≥ 5.0).
//   house – the default: about 6 % of the House's colour (its accentColor) over the cream (lowered until the times keep 4.5 : 1)
//   cream · stone · mist · sand – light, calm grounds; night – dark: the others' bubbles dark grey, yours light, the words turned round.
// Stored on the account (User.settings.chatTheme for all, .chatThemes per chat – lib/store.tsx setChatTheme), so it follows the person to
// every device and only they see it. TODO(backend): users/{uid}.settings.
import type { CSSProperties } from "react";

export const CHAT_THEME_IDS = ["house", "cream", "stone", "mist", "sand", "night"] as const;
export type ChatThemeId = (typeof CHAT_THEME_IDS)[number];
export const DEFAULT_CHAT_THEME: ChatThemeId = "house";

interface ChatTheme {
  /** The chat's ground (house: the cream, the House's colour mixed in) */
  bg: string;
  /** The others' bubble, its fine line, its words */
  other: string;
  otherLine: string;
  text: string;
  /** Your bubble and its words */
  own: string;
  ownText: string;
  /** Times, names, system lines on the ground */
  muted: string;
  /** The message field */
  input: string;
  /** Dark ground: the head and menus turn round with it */
  dark: boolean;
}

export const CHAT_THEMES: Record<ChatThemeId, ChatTheme> = {
  house: { bg: "#f3efea", other: "#ffffff", otherLine: "rgba(0, 0, 0, 0.04)", text: "#221e1b", own: "#48423e", ownText: "#ffffff", muted: "rgba(34, 30, 27, 0.66)", input: "#fbf8f4", dark: false },
  cream: { bg: "#f3efea", other: "#ffffff", otherLine: "rgba(0, 0, 0, 0.04)", text: "#221e1b", own: "#48423e", ownText: "#ffffff", muted: "rgba(34, 30, 27, 0.66)", input: "#fbf8f4", dark: false },
  stone: { bg: "#e4e1dd", other: "#ffffff", otherLine: "rgba(0, 0, 0, 0.05)", text: "#221e1b", own: "#3b3734", ownText: "#ffffff", muted: "rgba(34, 30, 27, 0.72)", input: "#f6f4f1", dark: false },
  mist: { bg: "#e2e8ec", other: "#ffffff", otherLine: "rgba(0, 0, 0, 0.05)", text: "#1f2a31", own: "#2f4250", ownText: "#ffffff", muted: "rgba(31, 42, 49, 0.72)", input: "#f4f7f9", dark: false },
  sand: { bg: "#ebdfcd", other: "#fffaf2", otherLine: "rgba(0, 0, 0, 0.05)", text: "#2a2018", own: "#5b4535", ownText: "#ffffff", muted: "rgba(42, 32, 24, 0.72)", input: "#fbf5ec", dark: false },
  night: { bg: "#1b1918", other: "#2f2c2a", otherLine: "rgba(255, 255, 255, 0.06)", text: "#f4eee7", own: "#ece5dc", ownText: "#221e1b", muted: "rgba(244, 238, 231, 0.7)", input: "#262321", dark: true },
};

/**
 * The chat's CSS variables for a theme. `houseShare`: for "house", how much of the House's colour goes over the cream (lib/stageTint.ts
 * chatHouseShare – at most 6 %, lowered for contrast).
 */
export function chatThemeStyle(id: ChatThemeId, accent?: string, houseShare = 0): CSSProperties {
  const theme = CHAT_THEMES[id];
  const bg = id === "house" && accent && houseShare > 0 ? `color-mix(in oklab, ${theme.bg} ${100 - houseShare}%, ${accent} ${houseShare}%)` : theme.bg;
  return {
    "--chat-bg": bg,
    "--bubble-other": theme.other,
    "--bubble-other-line": theme.otherLine,
    "--bubble-own": theme.own,
    "--bubble-own-text": theme.ownText,
    "--chat-input": theme.input,
    "--text": theme.text,
    "--text-muted": theme.muted,
    colorScheme: theme.dark ? "dark" : "light",
    color: theme.text,
  } as CSSProperties;
}

/** The round preview's ground: "house" shows a hint of a House colour (a warm clay, as an example – each chat takes its own House's). */
export function chatThemePreview(id: ChatThemeId): string {
  return id === "house" ? `color-mix(in oklab, ${CHAT_THEMES.house.bg} 88%, #b9785a 12%)` : CHAT_THEMES[id].bg;
}
