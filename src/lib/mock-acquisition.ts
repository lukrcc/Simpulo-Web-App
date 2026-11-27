// Mock (dev and demo only): 60 Founding-Host contacts for Admin › Marketing › Akquise – invented people, fixed (the same on every load),
// spread over the chain so every view has something to show: 23 from „Bestätigt“ on, some steps overdue around late November 2026.
import { ACQUISITION_CHAIN, type AcquisitionContact, type AcquisitionPlatform, type AcquisitionStatus, type AcquisitionType } from "./acquisition";

const NAMES = [
  "Mara", "Jonas", "Lea", "Tomás", "Priya", "Noah", "Sofia", "Kenji", "Amira", "Luca", "Hanna", "Diego", "Yara", "Felix", "Ines", "Omar",
  "Clara", "Mateo", "Aisha", "Finn", "Nora", "Rafael", "Lina", "Ben", "Zoe", "Elias", "Mila", "Hugo", "Sara", "Theo", "Ana", "Malik",
  "Emma", "Leo", "Isla", "Karim", "Julia", "Nico", "Freya", "Samir", "Paula", "Jan", "Maya", "Oskar", "Lucía", "Tim", "Alma", "Ravi",
  "Greta", "Arturo", "Selin", "Max", "Ivy", "Pedro", "Lotte", "Yusuf", "Chloé", "Erik", "Nadia", "Bruno",
] as const;

const PLACES = ["Lisbon", "Bali", "Bangkok", "Ericeira", "Tbilisi", "Mexico City", "Madeira", "Barcelona", "Chiang Mai", "Berlin"] as const;
const THEMES = ["Surf", "Remote work", "Fitness", "Creator", "Founder", "Wellness", "Climbing", "Writing"] as const;

/** The status of each contact by position: 2 posted, 3 launch kit, 5 friends invited, 13 confirmed, 4 draft, 5 call, 8 replied, 15 written to, 5 declined. */
const PLAN: readonly [AcquisitionStatus, number][] = [
  ["posted", 2], ["launchKit", 3], ["friendsInvited", 5], ["confirmed", 13], ["draft", 4], ["call", 5], ["replied", 8], ["contacted", 15], ["declined", 5],
];

const TYPES: readonly AcquisitionType[] = ["nomad", "smallCreator", "nomad", "earningHost", "smallCreator", "bigCreator", "group", "nomad"];
const PLATFORM_OF: Record<AcquisitionType, readonly AcquisitionPlatform[]> = {
  nomad: ["instagram", "reddit", "personal", "tiktok"],
  smallCreator: ["instagram", "tiktok"],
  bigCreator: ["email", "instagram"],
  earningHost: ["linkedin", "email", "personal"],
  group: ["group", "reddit"],
};
const FOLLOWERS: Record<AcquisitionType, readonly number[]> = {
  nomad: [420, 1300, 860, 2900, 610],
  smallCreator: [8400, 14200, 22600, 5600, 31800],
  bigCreator: [128000, 245000, 96000, 410000],
  earningHost: [1100, 380, 2400],
  group: [3400, 12800, 7600],
};

const NEXT: Record<AcquisitionStatus, string> = {
  contacted: "Nachfassen",
  replied: "Call vorschlagen",
  call: "Call führen",
  draft: "Entwurf durchgehen",
  confirmed: "Freunde einladen lassen",
  friendsInvited: "Launch-Kit schicken",
  launchKit: "An Story am Launch-Tag erinnern",
  posted: "Danke sagen",
  declined: "",
};

const DAY = 86_400_000;
const shift = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
const START = "2026-10-12";

export function mockAcquisitionContacts(): AcquisitionContact[] {
  const out: AcquisitionContact[] = [];
  let i = 0;
  for (const [status, count] of PLAN) {
    for (let k = 0; k < count; k += 1, i += 1) {
      const name = NAMES[i];
      const type = TYPES[i % TYPES.length];
      const platform = PLATFORM_OF[type][i % PLATFORM_OF[type].length];
      const handle = name.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
      const profileUrl =
        platform === "email" ? `mailto:${handle}@example.com` : platform === "instagram" ? `https://instagram.com/${handle}.${PLACES[i % PLACES.length].toLowerCase().replace(/\s/g, "")}` : platform === "tiktok" ? `https://www.tiktok.com/@${handle}` : platform === "linkedin" ? `https://www.linkedin.com/in/${handle}` : platform === "reddit" ? `https://www.reddit.com/user/${handle}` : platform === "group" ? `https://www.facebook.com/groups/${handle}-nomads` : "";
      // The history: each step of the chain up to the status, a few days apart; declined after one or two steps.
      const reached = status === "declined" ? ACQUISITION_CHAIN.slice(0, 1 + (i % 2)) : ACQUISITION_CHAIN.slice(0, ACQUISITION_CHAIN.indexOf(status) + 1);
      let at = shift(START, (i * 5) % 30);
      const history: AcquisitionContact["history"] = reached.map((s, n) => {
        if (n > 0) at = shift(at, 2 + ((i + n) % 4));
        return { status: s, at };
      });
      if (status === "declined") history.push({ status: "declined", at: shift(at, 3) });
      // Due: around late November – one in nine already overdue, some due today; nothing for declined and posted.
      const dueAt = status === "declined" ? null : shift("2026-11-28", (i % 9) - 2);
      const founding = ACQUISITION_CHAIN.indexOf(status as (typeof ACQUISITION_CHAIN)[number]) >= ACQUISITION_CHAIN.indexOf("confirmed");
      out.push({
        id: `acq-${String(i + 1).padStart(2, "0")}`,
        name,
        platform,
        profileUrl,
        type,
        followers: FOLLOWERS[type][i % FOLLOWERS[type].length],
        status,
        nextStep: NEXT[status],
        dueAt: status === "posted" ? null : dueAt,
        // Invented numbers in the 555 range – never real ones.
        whatsapp: founding || status === "draft" || status === "call" ? `4915550${String(1000 + i * 37).slice(0, 4)}` : null,
        draftUrl: founding || status === "draft" ? `/create?draft=acq-${i + 1}` : null,
        note: i % 4 === 0 ? `${THEMES[i % THEMES.length]} in ${PLACES[i % PLACES.length]}` : "",
        history,
        launch: { kit: status === "launchKit" || status === "posted", story: status === "posted", bio: status === "posted" && i % 2 === 0 },
      });
    }
  }
  return out;
}
