/**
 * Why the auth sheet opened (`reason` – every requireAuth call passes one). Its heading and line are texts in lib/i18n/en.ts
 * (auth.reasons.<reason>, `{hostName}` the host's first name, else "the host"). The heading's final "." is the colour of its words.
 */
export type AuthReason = "join" | "open" | "save" | "message" | "login" | "signup" | "yourHouses" | "messages";
