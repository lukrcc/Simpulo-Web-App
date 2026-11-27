// Every overview tile leads to a visible capsule (CLAUDE.md "Jede Kachel → eine Kapsel"): per admin page its capsules (in order, each with an
// unit colour from the palette, Überblick none) and the route of each tile: the capsule, an optional focus (?focus= – a number highlighted, a filter or a
// sort set by the page) and, for a tile of another page, that page. Several tiles may lead to the same capsule. Structure only – the words
// live in the pages' i18n (CLAUDE.md "Configs halten Struktur, keine Wörter").

export type AdminPageKey = "overview" | "money" | "growth" | "analysis" | "houses" | "hosts" | "marketing" | "data" | "labs" | "funding" | "vision" | "inbox" | "system" | "zeitplan";

/**
 * The unit palette (admin-tokens.css --adm-unit-*, CLAUDE.md "Ein Farbprofil"), in order: Blau · Grün · Gelb · Orange · Pink · Lila – six
 * clearly different hues. A page's capsules take them one after another (Überblick none) unless the page names its own (capsAs). Every hue
 * at most once per page (CLAUDE.md "Jeder Farbton nur einmal pro Seite"): a page with more than six units merges capsules instead of
 * repeating a colour – unitClashes() reports a breach (dev, the admin frame).
 */
export const UNIT_PALETTE = ["blue", "green", "yellow", "orange", "pink", "lilac"] as const;
export type UnitColor = (typeof UNIT_PALETTE)[number];

export interface CapsuleDef {
  key: string;
  /** Its unit colour – set by position (UNIT_PALETTE, after "overview"); null: none (Überblick, Aufgaben's kinds have their own) */
  unit?: UnitColor | null;
}

export interface TileRoute {
  /** The capsule (?tab=) */
  tab: string;
  /** The unit it belongs to by colour and place, when not its capsule's (Geld: "Kosten" explains the result – it stands with Verlauf) */
  unit?: string;
  /** What the capsule opens with (?focus=) – a number highlighted (data-focus-key), a filter or a sort */
  focus?: string;
  /** A tile of another page: that page */
  page?: AdminPageKey;
}

export interface AdminPageDef {
  path: string;
  capsules: readonly CapsuleDef[];
  tiles: Readonly<Record<string, TileRoute>>;
  /** The tiles' fixed order on the overview (else grouped by unit, in the capsules' order) */
  order?: readonly string[];
}

/** A page's capsules: "overview" without a colour, the others the palette in order. */
const caps = (...keys: string[]): CapsuleDef[] => {
  let i = 0;
  // Past the sixth unit no colour (unitClashes reports it) – a hue never repeats on a page.
  return keys.map((key) => ({ key, unit: key === "overview" ? null : (UNIT_PALETTE[i++] ?? null) }));
};
/** A page's capsules with named colours (Geld, Übersicht): "overview" without one. */
const capsAs = (...pairs: readonly (readonly [string, UnitColor | null])[]): CapsuleDef[] => pairs.map(([key, unit]) => ({ key, unit }));
/** Aufgaben: its kinds have their own colours – no units. */
const plain = (...keys: string[]): CapsuleDef[] => keys.map((key) => ({ key, unit: null }));

export const ADMIN_PAGES: Readonly<Record<AdminPageKey, AdminPageDef>> = {
  // Übersicht: Überblick (all 20 tiles) and one capsule per row's group – Heute · Richtung · Geld · Nachfrage · Qualität (CLAUDE.md
  // "Übersicht mit Kapseln"); a tile opens its group's capsule with its number highlighted (?focus=<tile>).
  overview: {
    path: "/admin",
    capsules: capsAs(["overview", null], ["today", "blue"], ["direction", "orange"], ["money", "green"], ["demand", "yellow"], ["quality", "lilac"]),
    tiles: {
      inbox: { tab: "today", focus: "inbox" },
      needsHelp: { tab: "today", focus: "needsHelp" },
      pipeline: { tab: "direction", focus: "pipeline" },
      launch: { tab: "direction", focus: "launch" },
      marketCap: { tab: "direction", focus: "marketCap" },
      bookingVolume: { tab: "money", focus: "bookingVolume" },
      revenue: { tab: "money", focus: "revenue" },
      profit: { tab: "money", focus: "profit" },
      bookings: { tab: "money", focus: "bookings" },
      perBooking: { tab: "money", focus: "perBooking" },
      visitors: { tab: "demand", focus: "visitors" },
      requests: { tab: "demand", focus: "requests" },
      bestChannel: { tab: "demand", focus: "bestChannel" },
      waitlist: { tab: "demand", focus: "waitlist" },
      webApp: { tab: "demand", focus: "webApp" },
      openHouses: { tab: "quality", focus: "openHouses" },
      fullHouses: { tab: "quality", focus: "fullHouses" },
      nights: { tab: "quality", focus: "nights" },
      connection: { tab: "quality", focus: "connection" },
      repeat: { tab: "quality", focus: "repeat" },
    },
  },
  // Geld: the capsules Überblick · Verlauf · Kosten · Gäste · Hosts · Zahlungen · Steuern (old ?tab=payouts → Zahlungen) and the overview as a
  // fixed 4 × 4 grid: R1 the result (Verlauf; "Kosten" leads to Kosten but stands with the result, in its colour) · R2 Take Rate, Hochrechnung
  // (Verlauf) | Stripe-Gebühren, Weitere Kosten (Kosten) · R3 Ø pro Buchung, Gast pro Jahr, Erstattungen (Gäste) | Host pro Jahr (Hosts) ·
  // R4 Zahlungsprobleme, Auszahlungen offen (Zahlungen) | Steuer-Rücklage, Nächste Steuerfrist (Steuern).
  money: {
    path: "/admin/money",
    capsules: capsAs(["overview", null], ["history", "green"], ["costs", "orange"], ["guests", "blue"], ["hosts", "lilac"], ["payments", "pink"], ["taxes", "yellow"]),
    order: ["bookingVolume", "revenue", "costs", "profit", "takeRate", "monthForecast", "stripeFees", "otherCosts", "perGuest", "valuePerGuestYear", "refunds", "valuePerHostYear", "paymentIssues", "openPayouts", "taxReserve", "nextDeadline"],
    tiles: {
      bookingVolume: { tab: "history", focus: "bookingVolume" },
      revenue: { tab: "history", focus: "revenue" },
      costs: { tab: "costs", focus: "costs", unit: "history" },
      profit: { tab: "history", focus: "profit" },
      takeRate: { tab: "history", focus: "takeRate" },
      monthForecast: { tab: "history", focus: "monthForecast" },
      stripeFees: { tab: "costs", focus: "stripeFees" },
      otherCosts: { tab: "costs", focus: "otherCosts" },
      perGuest: { tab: "guests", focus: "perGuest" },
      valuePerGuestYear: { tab: "guests", focus: "valuePerGuestYear" },
      refunds: { tab: "guests", focus: "refunds" },
      valuePerHostYear: { tab: "hosts", focus: "valuePerHostYear" },
      paymentIssues: { tab: "payments", focus: "paymentIssues" },
      openPayouts: { tab: "payments", focus: "openPayouts" },
      taxReserve: { tab: "taxes", focus: "taxReserve" },
      nextDeadline: { tab: "taxes", focus: "nextDeadline" },
      withdrawals: { tab: "taxes", focus: "withdrawals" },
    },
  },
  growth: {
    path: "/admin/growth",
    capsules: caps("overview", "origin", "houses", "usage", "waitlist"),
    tiles: {
      visitors: { tab: "origin", focus: "visitors" },
      requests: { tab: "origin", focus: "requests" },
      paid: { tab: "origin", focus: "paid" },
      valueToCost: { tab: "origin", focus: "valueToCost" },
      bestChannel: { tab: "origin", focus: "bestChannel" },
      topRef: { tab: "origin", focus: "topRef" },
      costs: { tab: "origin", focus: "costs" },
      origin: { tab: "origin" },
      costPerBooking: { tab: "origin", focus: "costPerBooking" },
      signups: { tab: "origin", focus: "signups" },
      lookedNotAsked: { tab: "houses", focus: "lookedNotAsked" },
      topHouse: { tab: "houses", focus: "topHouse" },
      installs: { tab: "usage", focus: "installs" },
      askToRequest: { tab: "usage", focus: "askToRequest" },
      askNote: { tab: "usage", focus: "askNote" },
      waitlist: { tab: "waitlist" },
    },
  },
  analysis: {
    path: "/admin/topics",
    // Six units at most: Ort-Typ, Ort-Herkunft and Hub are one capsule "Ort", Stufe and Tiefe one capsule "Host" (sub-tabs under them).
    capsules: caps("overview", "value", "topic", "length", "crew", "place", "host"),
    tiles: {
      valueCheck: { tab: "value" },
      sweetSpot: { tab: "topic" },
      "dim-topic": { tab: "topic" },
      "dim-length": { tab: "length" },
      "dim-crew": { tab: "crew" },
      "dim-category": { tab: "category", unit: "place" },
      "dim-origin": { tab: "origin", unit: "place" },
      "dim-hub": { tab: "hub", unit: "place" },
      "dim-tier": { tab: "tier", unit: "host" },
      "dim-depth": { tab: "depth", unit: "host" },
      "leader-connection": { tab: "topic", focus: "connection" },
      "leader-repeat": { tab: "topic", focus: "repeat" },
      "leader-speed": { tab: "topic", focus: "speed" },
      perHouse: { tab: "topic", focus: "value" },
    },
  },
  houses: {
    path: "/admin/houses",
    capsules: caps("overview", "atRisk", "goingWell", "all"),
    tiles: {
      all: { tab: "all" },
      atRisk: { tab: "atRisk" },
      goingWell: { tab: "goingWell" },
      open: { tab: "all", focus: "open" },
      full: { tab: "all", focus: "full" },
      reserved: { tab: "all", focus: "reserved" },
      cancelled: { tab: "all", focus: "cancelled" },
      soon: { tab: "all", focus: "soon" },
      fill: { tab: "all", focus: "fill" },
      quiet: { tab: "atRisk", focus: "quiet" },
      unanswered: { tab: "atRisk", focus: "unanswered" },
      fastest: { tab: "goingWell" },
    },
  },
  hosts: {
    path: "/admin/hosts",
    capsules: caps("overview", "all", "review", "applications", "prepared"),
    tiles: {
      all: { tab: "all" },
      share: { tab: "all", focus: "share" },
      pro: { tab: "all", focus: "pro" },
      anchor: { tab: "all", focus: "anchor" },
      founding: { tab: "all", focus: "founding" },
      review: { tab: "review" },
      applications: { tab: "applications" },
      prepared: { tab: "prepared" },
      value: { tab: "all", focus: "value" },
      fill: { tab: "all", focus: "fill" },
      recurring: { tab: "all", focus: "recurring" },
      active: { tab: "all", focus: "inactive" },
    },
  },
  marketing: {
    path: "/admin/marketing",
    capsules: caps("overview", "countdown", "pipeline", "partners", "content", "levers", "akquise"),
    tiles: {
      launch: { tab: "countdown" },
      levers: { tab: "levers" },
      housesOpened: { tab: "countdown", focus: "housesOpened" },
      hubs: { tab: "countdown", focus: "hubs" },
      waitlist: { tab: "countdown", focus: "waitlist" },
      filled: { tab: "countdown", focus: "filled" },
      contacted: { tab: "pipeline", focus: "contacted" },
      replyRate: { tab: "pipeline", focus: "replyRate" },
      demoRate: { tab: "pipeline", focus: "demoRate" },
      houses: { tab: "pipeline", focus: "houses" },
      forFifty: { tab: "pipeline", focus: "forFifty" },
      partners: { tab: "partners" },
      partnerSteps: { tab: "partners", focus: "due" },
      shorts: { tab: "content" },
      content: { tab: "content" },
      nextStep: { tab: "partners", focus: "due" },
    },
  },
  data: {
    path: "/admin/data",
    capsules: caps("overview", "flow", "theses", "points"),
    tiles: {
      points: { tab: "points" },
      used: { tab: "points", focus: "used" },
      collecting: { tab: "points", focus: "collecting" },
      planned: { tab: "points", focus: "planned" },
      never: { tab: "points", focus: "never" },
      moments: { tab: "flow" },
      models: { tab: "flow" },
      idea: { tab: "flow" },
      rules: { tab: "flow" },
      trained: { tab: "flow" },
      decisions: { tab: "flow" },
      theses: { tab: "theses" },
      supported: { tab: "theses" },
      open: { tab: "theses" },
      rejected: { tab: "theses" },
    },
  },
  labs: {
    path: "/admin/labore",
    capsules: caps("overview", "pyramid", "map", "labs", "flow", "potential"),
    // The cards lead to "Labore" with that lab chosen (?focus=<lab id>) – the page sets it per card.
    tiles: {},
  },
  funding: {
    path: "/admin/funding",
    capsules: caps("overview", "readiness", "thesis", "rounds", "documents", "valuation", "structure"),
    tiles: {
      ready: { tab: "readiness" },
      repeat: { tab: "readiness", focus: "repeatRate" },
      growth: { tab: "readiness", focus: "fullHousesGrowth" },
      hubs: { tab: "readiness", focus: "hubsFill" },
      contribution: { tab: "readiness", focus: "contribution" },
      allocation: { tab: "thesis" },
      round: { tab: "rounds" },
      next: { tab: "rounds" },
      documents: { tab: "documents" },
      valuation: { tab: "valuation" },
      motors: { tab: "structure", focus: "motors" },
      structure: { tab: "structure", focus: "group" },
    },
  },
  // Vision: eight tiles, each to its capsule; "Verbindung" opens Schichten with layer 2 chosen, "Finanzierung" its own page.
  vision: {
    path: "/admin/vision",
    capsules: capsAs(["overview", null], ["layers", "blue"], ["continuum", "green"], ["market", "orange"], ["segments", "lilac"], ["roadmap", "yellow"], ["location", "pink"]),
    tiles: {
      layers: { tab: "layers" },
      continuum: { tab: "continuum" },
      market: { tab: "market" },
      segments: { tab: "segments" },
      connection: { tab: "layers", focus: "infrastructure" },
      roadmap: { tab: "roadmap" },
      location: { tab: "location" },
      funding: { page: "funding", tab: "overview" },
    },
  },
  // System: its overview's four sections belong to Einstellungen (Phase, Werte), Tools and Launch-Vorbereitung (the checklist).
  system: {
    path: "/admin/platform",
    capsules: caps("overview", "settings", "tools", "prepare"),
    tiles: {},
  },
  // Zeitplan: Zeitleiste (neutral) and one capsule per lane – Code lilac · Marketing yellow · Vorbereitung orange · Launch pink; a bar on the
  // timeline opens its lane's capsule with its entry marked (?focus=).
  zeitplan: {
    path: "/admin/zeitplan",
    capsules: capsAs(["timeline", null], ["code", "blue"], ["marketing", "green"], ["prep", "orange"], ["launch", "lilac"]),
    tiles: {},
  },
  inbox: {
    path: "/admin/aufgaben",
    capsules: plain("all", "houses", "hosts", "safety", "money", "questions"),
    tiles: {},
  },
};

/** The URL of a route: its page's path with ?tab= (the page's first capsule is its default – left out) and ?focus=. */
export function routeHref(from: AdminPageKey, route: TileRoute): string {
  const page = ADMIN_PAGES[route.page ?? from];
  const params = new URLSearchParams();
  if (route.tab !== page.capsules[0]?.key) params.set("tab", route.tab);
  if (route.focus) params.set("focus", route.focus);
  const q = params.toString();
  return `${page.path}${q ? `?${q}` : ""}`;
}

/** A tile that leads to another page: filled in neutral silver (admin-tokens.css --adm-unit-silver), never unfilled. */
export const NEUTRAL_UNIT = "var(--adm-page-color)";

/** A capsule's unit colour as a CSS colour (var(--adm-unit-…)), or null. */
/** The capsule a tab belongs to when sub-tabs sit under it (Analyse: Ort-Typ, Ort-Herkunft, Hub → "place"; Stufe, Tiefe → "host"). */
export const CAPSULE_OF: Partial<Record<AdminPageKey, Readonly<Record<string, string>>>> = {
  analysis: { category: "place", origin: "place", hub: "place", tier: "host", depth: "host" },
};

/** Every page whose capsules repeat a hue or have more units than hues (CLAUDE.md "Jeder Farbton nur einmal pro Seite") – empty when fine. */
export function unitClashes(): string[] {
  const out: string[] = [];
  for (const [page, def] of Object.entries(ADMIN_PAGES)) {
    const units = def.capsules.filter((c) => c.key !== "overview");
    const colours = units.map((c) => c.unit).filter((u): u is UnitColor => Boolean(u));
    const twice = colours.filter((u, i) => colours.indexOf(u) !== i);
    if (twice.length) out.push(`${page}: ${[...new Set(twice)].join(", ")} doppelt`);
    if (page !== "inbox" && units.length > UNIT_PALETTE.length) out.push(`${page}: ${units.length} Einheiten, nur ${UNIT_PALETTE.length} Farbtöne – Kapseln zusammenfassen`);
  }
  return out;
}

export const unitColorOf = (page: AdminPageKey, tab: string): string | null => {
  const key = CAPSULE_OF[page]?.[tab] ?? tab;
  const unit = ADMIN_PAGES[page].capsules.find((c) => c.key === key)?.unit;
  // "Eine Farbe = eine Seite" (CLAUDE.md): every unit-bearing capsule (and its tiles, bands) takes the page's one colour.
  return unit ? "var(--adm-page-color)" : null;
};
