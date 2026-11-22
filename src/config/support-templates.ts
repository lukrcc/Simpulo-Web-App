// Admin › Aufgaben › Sicherheit: the kinds of a safety case (CLAUDE.md "Aufgaben – Sicherheit mit Unterarten"). Each has its reply template
// and its extra actions. Structure only – the template words are English (they go to the person) and live in lib/i18n/en.ts
// supportTemplates.safety.<kind> (Regel "Configs halten Struktur, keine Wörter"); the admin's labels in admin-inbox.de.ts.
//
// The kind is recognised from the report's reason (in-app reports) or from key words in a ticket's message; the admin can change it in the
// head of the "Anfrage" card (stored per task, AdminData.safetySubtypes, logged).
import type { ReportReason } from "@/lib/types";

export const SAFETY_SUBTYPES = ["harassment", "payment", "onsite"] as const;
export type SafetySubtype = (typeof SAFETY_SUBTYPES)[number];

/** The extra actions per kind – each asks once, each is logged (lib/admin/actions.ts). */
export const SAFETY_ACTIONS: Record<SafetySubtype, readonly ("restrict" | "suspend" | "warnHost" | "pauseHouse")[]> = {
  harassment: ["restrict", "suspend"],
  payment: ["warnHost", "pauseHouse"],
  onsite: [],
};

/** A report's reason → its kind. */
export const SUBTYPE_OF_REASON: Partial<Record<ReportReason, SafetySubtype>> = {
  harassment: "harassment",
  inappropriate: "harassment",
  scam: "payment",
  safety: "onsite",
};

/** Key words in a ticket's message (lower case, English and German), checked in this order; nothing found: on site. */
export const SUBTYPE_KEYWORDS: readonly [SafetySubtype, readonly string[]][] = [
  ["payment", ["cash", "pay outside", "outside simpulo", "bank transfer", "paypal", "western union", "wire", "scam", "fraud", "deposit", "bar bezahlen", "überweisung", "betrug"]],
  ["harassment", ["harass", "messaging me", "keeps messaging", "threat", "stalk", "creep", "unwanted", "touched", "inappropriate", "belästig", "bedroh"]],
  ["onsite", ["injur", "accident", "hurt", "unsafe", "fire", "gas", "lock", "door", "broken", "hospital", "police", "mold", "unfall", "verletz", "feuer"]],
];

/** The kind of a case: the report's reason, else the first key word found, else on site. */
export function detectSafetySubtype(input: { reason?: ReportReason; text?: string }): SafetySubtype {
  if (input.reason && SUBTYPE_OF_REASON[input.reason]) return SUBTYPE_OF_REASON[input.reason]!;
  const text = (input.text ?? "").toLowerCase();
  for (const [kind, words] of SUBTYPE_KEYWORDS) if (words.some((w) => text.includes(w))) return kind;
  return "onsite";
}
