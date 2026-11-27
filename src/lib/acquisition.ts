// Admin › Marketing › Akquise: winning the first 100 Founding Hosts before the launch. The data model and its numbers – pure, no clock,
// no storage – so the same shapes move to Firestore later (TODO(firestore): collection `acquisitionContacts`, admins only, one document per
// contact with its history as an array; `acquisitionDays/{YYYY-MM-DD}` for the DMs sent; `acquisitionTemplates/{id}` for edited templates).
// Simpulo never talks to WhatsApp, Instagram or email here – the page only opens links.

export type AcquisitionPlatform = "instagram" | "tiktok" | "linkedin" | "email" | "group" | "reddit" | "personal";
export const ACQUISITION_PLATFORMS: readonly AcquisitionPlatform[] = ["instagram", "tiktok", "linkedin", "email", "group", "reddit", "personal"];

export type AcquisitionType = "nomad" | "smallCreator" | "bigCreator" | "earningHost" | "group";
export const ACQUISITION_TYPES: readonly AcquisitionType[] = ["nomad", "smallCreator", "bigCreator", "earningHost", "group"];

/** The chain, in order – „Abgesagt“ stands beside it and never counts in it. */
export const ACQUISITION_CHAIN = ["contacted", "replied", "call", "draft", "confirmed", "friendsInvited", "launchKit", "posted"] as const;
export type AcquisitionChainStatus = (typeof ACQUISITION_CHAIN)[number];
export type AcquisitionStatus = AcquisitionChainStatus | "declined";
export const ACQUISITION_STATUSES: readonly AcquisitionStatus[] = [...ACQUISITION_CHAIN, "declined"];

export interface AcquisitionContact {
  id: string;
  name: string;
  platform: AcquisitionPlatform;
  /** Their profile (Instagram, TikTok …) or a mailto: link – opened, never called */
  profileUrl: string;
  type: AcquisitionType;
  followers: number;
  status: AcquisitionStatus;
  nextStep: string;
  /** YYYY-MM-DD; null = nothing due */
  dueAt: string | null;
  /** International number, digits only (for wa.me) – optional */
  whatsapp: string | null;
  /** The House draft they opened (Open a House) – optional */
  draftUrl: string | null;
  note: string;
  /** Every status change with its day (the first entry: written to) */
  history: { status: AcquisitionStatus; at: string }[];
  /** Launch-Tag: the three checks */
  launch: { kit: boolean; story: boolean; bio: boolean };
}

/** A status's place in the chain; -1 for „Abgesagt“. */
export const chainIndex = (status: AcquisitionStatus) => (status === "declined" ? -1 : ACQUISITION_CHAIN.indexOf(status));

/** From „Bestätigt“ on a contact is a Founding Host (and on the Launch-Tag list). */
export const isFounding = (c: Pick<AcquisitionContact, "status">) => chainIndex(c.status) >= chainIndex("confirmed");

/** Did they ever answer? Any step past „Angeschrieben“ in their history (a later „Abgesagt“ still counts as an answer). */
export const hasReplied = (c: Pick<AcquisitionContact, "history">) => c.history.some((h) => chainIndex(h.status) >= chainIndex("replied"));

/** A next step that is due today or earlier – only while the contact is still on the way (not declined, not posted). */
export const isDue = (c: Pick<AcquisitionContact, "dueAt" | "status">, today: string) => c.dueAt !== null && c.dueAt <= today && c.status !== "declined" && c.status !== "posted";
export const isOverdue = (c: Pick<AcquisitionContact, "dueAt" | "status">, today: string) => c.dueAt !== null && c.dueAt < today && c.status !== "declined" && c.status !== "posted";

/** Calls held between two days: the history's „Call“ entries in that span. */
export const callsBetween = (contacts: readonly AcquisitionContact[], from: string, to: string) =>
  contacts.reduce((n, c) => n + c.history.filter((h) => h.status === "call" && h.at >= from && h.at <= to).length, 0);

export interface AcquisitionNumbers {
  contacts: number;
  founding: number;
  replied: number;
  /** Antwort ÷ Angeschrieben (0–1), null without contacts */
  replyRate: number | null;
  posted: number;
  declined: number;
  /** Contacts per status right now */
  byStatus: Record<AcquisitionStatus, number>;
}

export function acquisitionNumbers(contacts: readonly AcquisitionContact[]): AcquisitionNumbers {
  const byStatus = Object.fromEntries(ACQUISITION_STATUSES.map((s) => [s, 0])) as Record<AcquisitionStatus, number>;
  for (const c of contacts) byStatus[c.status] += 1;
  const replied = contacts.filter(hasReplied).length;
  return {
    contacts: contacts.length,
    founding: contacts.filter(isFounding).length,
    replied,
    replyRate: contacts.length > 0 ? replied / contacts.length : null,
    posted: byStatus.posted,
    declined: byStatus.declined,
    byStatus,
  };
}

/** A WhatsApp link (wa.me) – digits only, null without a number. */
export const waLink = (number: string | null) => {
  const digits = (number ?? "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
};

/** Fill the placeholders a template knows ({Name}, {Ort}, {Thema}); unknown ones stay visible. */
export const fillTemplate = (text: string, values: Partial<Record<"Name" | "Ort" | "Thema", string>>) =>
  text.replace(/\{(Name|Ort|Thema)\}/g, (all, key: "Name" | "Ort" | "Thema") => values[key] ?? all);
