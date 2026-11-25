// The messenger (CLAUDE.md "Messenger – lange Info-Leiste unten, flaches Eingabefeld"): two variants to compare, from 744px (list and chat
// side by side). 'top': the input line at the top of the chat, the newest message right under it (the newest first). 'bottom': the input
// line at the bottom over the info bar, the messages as usual (the newest last). Phones: the chat page keeps the input at the bottom.
export const MESSENGER = {
  composerPosition: "bottom" as "top" | "bottom",
  /** The chat column's head (House or person, crew, settings, "…") – CLAUDE.md "Messages: Kopf oben, Schreibleiste unten" */
  infoBarHeight: 64,
} as const;
