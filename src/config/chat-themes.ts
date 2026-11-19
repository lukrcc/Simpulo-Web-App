// Chat backgrounds – a choice per person (Messages › "…" › Chat background for one chat, Settings › Chats for all). No free colours: these six,
// each with everything a chat paints – the ground, the others' bubble (and its fine line), your bubble, the words in each, the times. Every
// pair holds 4.5 : 1 (measured: text on the ground ≥ 11.8, in the others' bubble ≥ 12.0, in yours ≥ 8.9, the times ≥ 5.0). In dark mode every
// light background has a darkened variant (styles/tokens.css) – night stays night.
//   house – the default: about 6 % of the House's colour (its accentColor) over the cream (lowered until the times keep 4.5 : 1)
//   cream · stone · mist · sand – light, calm grounds; night – dark: the others' bubbles dark grey, yours light, the words turned round.
// Stored on the account (User.settings.chatTheme for all, .chatThemes per chat – lib/store.tsx setChatTheme), so it follows the person to
// every device and only they see it. TODO(backend): users/{uid}.settings.
import type { CSSProperties } from "react";

export const CHAT_THEME_IDS = ["house", "cream", "stone", "mist", "sand", "night"] as const;
export type ChatThemeId = (typeof CHAT_THEME_IDS)[number];
export const DEFAULT_CHAT_THEME: ChatThemeId = "house";

/** Whether a chat background is dark in the light mode (night). In dark mode every chat background is dark (its darkened variant). */
export const CHAT_THEME_DARK: Record<ChatThemeId, boolean> = { house: false, cream: false, stone: false, mist: false, sand: false, night: true };

/**
 * The colours live in styles/tokens.css ([data-chat-theme="…"], and :root[data-theme="dark"] [data-chat-theme="…"] – each light background has a
 * darkened variant in dark mode; night stays night). Here only what a chat adds: for "house", the House's colour and how much of it goes over
 * the ground (lib/stageTint.ts chatHouseShare – at most 6 %, lowered for contrast). `houseShare` 0 or no accent: the plain ground.
 */
export function chatThemeStyle(id: ChatThemeId, accent?: string, houseShare = 0): CSSProperties | undefined {
  if (id !== "house" || !accent || houseShare <= 0) return undefined;
  return { "--chat-accent": accent, "--chat-house-share": `${houseShare}%` } as CSSProperties;
}

/** The round preview's "house": a hint of a House colour (a warm clay, as an example – each chat takes its own House's). */
export const CHAT_PREVIEW_STYLE: Partial<Record<ChatThemeId, CSSProperties>> = {
  house: { "--chat-accent": "#b9785a", "--chat-house-share": "12%" } as CSSProperties,
};
