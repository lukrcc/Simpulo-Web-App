/**
 * The auth sheet's heading and line, by what made it open (`reason` – every requireAuth call passes one). `{hostName}` is the host's first
 * name. The heading's final "." is the same colour as its words – the orange dot belongs to the logo alone.
 */
export type AuthReason = "join" | "open" | "save" | "message" | "login" | "yourHouses" | "messages";

export const AUTH_COPY: Record<AuthReason, { title: string; subline: string }> = {
  join: { title: "Your spot is waiting.", subline: "Sign in to ask {hostName} if you can join." },
  open: { title: "Let's open your House.", subline: "Sign in and you're one step from your crew." },
  save: { title: "Keep this one.", subline: "Sign in to save Houses you like." },
  message: { title: "Say hi.", subline: "Sign in to message {hostName}." },
  login: { title: "Find your people.", subline: "Welcome back – or welcome in." },
  // The header's Your houses and Messages, clicked logged out.
  yourHouses: { title: "Your Houses live here.", subline: "Sign in to see the Houses you host and join." },
  messages: { title: "Your crew chats live here.", subline: "Sign in to message hosts and your crew." },
};

/** The copy for a reason, `{hostName}` filled in (without a name: "the host"). */
export function authCopy(reason: AuthReason, hostName?: string): { title: string; subline: string } {
  const copy = AUTH_COPY[reason];
  return { title: copy.title, subline: copy.subline.replaceAll("{hostName}", hostName || "the host") };
}
